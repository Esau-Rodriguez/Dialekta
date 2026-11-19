<?php
declare(strict_types=1);

function lesson_text($value): string {
    if (!is_string($value)) return '';
    return trim(preg_replace('/\s+/u', ' ', $value));
}

function lesson_key($value): string {
    $value = lesson_text($value);
    if (class_exists('Normalizer')) $value = Normalizer::normalize($value) ?: $value;
    return mb_strtolower($value, 'UTF-8');
}

// Una lección publicada conserva una actividad por palabra o frase y modalidad elegida.
function validate_lesson_exercises(object $lesson, array $words, array $translations, bool $unique, string $label): void {
    $ready = $unique && count($words) >= 4;
    $types = $lesson->exerciseTypes ?? (object)['choice' => $ready, 'memory' => $ready];
    if (!is_object($types)) fail("$label: revisa los tipos de ejercicio.");
    $expected = ['choice' => [], 'memory' => [], 'order' => []];
    foreach ($expected as $type => $_) {
        if (!is_bool($types->$type ?? false)) fail("$label: revisa los tipos de ejercicio.");
    }
    if (($types->choice ?? false) || ($types->memory ?? false)) {
        if (!$ready) fail("$label: usa cuatro o más pares sin repetir palabras ni traducciones, o desactiva opción múltiple y memoria.");
        foreach (['choice', 'memory'] as $type) {
            if ($types->$type ?? false) $expected[$type] = $words;
        }
    }
    if ($types->order ?? false) {
        $phrases = $lesson->phrases ?? [];
        if (!is_array($phrases) || !$phrases) fail("$label: agrega una frase para ordenar.");
        foreach ($phrases as $phrase) {
            $key = lesson_key($phrase);
            $tokens = explode(' ', $key);
            if (count(array_unique($tokens)) < 2 || isset($expected['order'][$key])) {
                fail("$label: cada frase para ordenar debe ser única y tener dos palabras distintas.");
            }
            sort($tokens, SORT_STRING);
            $expected['order'][$key] = $tokens;
        }
    }

    $exercises = $lesson->exercises ?? [];
    if (!is_array($exercises)) fail("$label: revisa la lista de ejercicios.");
    foreach ($exercises as $exercise) {
        $type = $exercise->type ?? '';
        if (!is_string($type) || !isset($expected[$type]) || lesson_text($exercise->prompt ?? null) === '') {
            fail("$label: vuelve a generar los ejercicios con las opciones seleccionadas.");
        }
        $answer = lesson_key($exercise->answer ?? null);
        $key = $type === 'order' ? $answer : lesson_key($exercise->word ?? null);
        if (!isset($expected[$type][$key])) fail("$label: los ejercicios ya no corresponden a las palabras o frases.");
        if ($type === 'order') {
            $tokens = $exercise->tokens ?? null;
            if (!is_array($tokens)) fail("$label: revisa las palabras del ejercicio de ordenar.");
            $tokens = array_map('lesson_key', $tokens);
            sort($tokens, SORT_STRING);
            if ($tokens !== $expected[$type][$key]) fail("$label: las palabras del ejercicio deben coincidir con la frase.");
        } else {
            $choices = $exercise->choices ?? null;
            if (!is_array($choices)) fail("$label: revisa las opciones de respuesta.");
            $choices = array_map('lesson_key', $choices);
            if ($answer !== $words[$key] || count($choices) !== 3 || count(array_unique($choices)) !== 3
                || !in_array($answer, $choices, true)
                || !isset($translations[$choices[0]], $translations[$choices[1]], $translations[$choices[2]])) {
                fail("$label: regenera las respuestas del ejercicio con las traducciones actuales.");
            }
        }
        unset($expected[$type][$key]);
    }
    if ($expected['choice'] || $expected['memory'] || $expected['order']) {
        fail("$label: genera todos los ejercicios seleccionados antes de publicar.");
    }
}

function has_published_lessons(object $data): bool {
    $lessons = $data->lessons ?? [];
    if (!is_array($lessons)) fail('Las lecciones del módulo deben formar una lista.');
    $published = false;
    foreach ($lessons as $index => $lesson) {
        if (!is_object($lesson)) fail('Revisa los datos de la lección ' . ($index + 1) . '.');
        // El catálogo anterior guarda las lecciones sin un estado editorial propio.
        if (!isset($lesson->status) || $lesson->status === 'draft') continue;
        $label = 'Lección ' . ($index + 1);
        if ($lesson->status !== 'published') fail("$label: el estado es inválido.");
        if (lesson_text($lesson->title ?? null) === '') fail("$label: escribe un título antes de publicar.");
        $entries = $lesson->words ?? [];
        if (!is_array($entries) || !$entries) fail("$label: agrega una palabra en totonaco con su traducción.");
        $words = [];
        $translations = [];
        $unique = true;
        foreach ($entries as $entry) {
            $word = lesson_key($entry->totonaco ?? null);
            $spanish = lesson_key($entry->spanish ?? null);
            if ($word === '' || $spanish === '') fail("$label: completa la palabra en totonaco y su traducción.");
            if (isset($words[$word]) || isset($translations[$spanish])) $unique = false;
            $words[$word] = $spanish;
            $translations[$spanish] = true;
        }
        validate_lesson_exercises($lesson, $words, $translations, $unique, $label);
        $published = true;
    }
    return $published;
}

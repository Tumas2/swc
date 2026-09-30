<?php

declare(strict_types=1);

use SWC\ComponentRegistry;
use SWC\StoreRegistry;

$fixtures = __DIR__ . '/fixtures';

/**
 * Builds a registry over the fixture components and stores.
 *
 * @param string $fixtures
 * @return ComponentRegistry
 */
function fixture_registry(string $fixtures): ComponentRegistry
{
    return new ComponentRegistry("{$fixtures}/components", '/c', new StoreRegistry("{$fixtures}/stores"));
}

Test::section('ComponentRegistry — nested rendering');

$registry = fixture_registry($fixtures);

// demo-shell provides theme (a store) and label (a value); demo-card uses both
// and renders demo-badge, which uses theme too. demo-card's markup pulls in a
// partial with an onclick handler.
Test::same(
    'renders the whole tree as nested DSD with context',
    '<demo-shell><template shadowrootmode="open">'
        . '<div class="shell"><demo-card><template shadowrootmode="open">'
            . '<article class="red"><h2><slot name="title">Untitled</slot></h2><p>Hello: 2</p>'
            . '<button data-swc-event-click="$increment">+</button>'
            . '<demo-badge><template shadowrootmode="open"><span>red</span><link rel="stylesheet" href="/c/demo-badge/style.css"></template></demo-badge>'
            . '</article><link rel="stylesheet" href="/c/demo-card/style.css"></template>'
        . '<span slot="title">Title</span></demo-card></div>'
    . '<link rel="stylesheet" href="/c/demo-shell/style.css"></template></demo-shell>',
    $registry->render('demo-shell')
);

Test::same(
    'light DOM mode flattens slots and drops stylesheets',
    '<demo-shell><div class="shell"><demo-card><article class="red"><h2><span slot="title">Title</span></h2><p>Hello: 2</p>'
        . '<button data-swc-event-click="$increment">+</button><demo-badge><span>red</span></demo-badge></article></demo-card></div></demo-shell>',
    $registry->render('demo-shell', shadow: false)
);

Test::same(
    'light_dom passed to render() is inserted as-is',
    '<demo-badge slot="x"><template shadowrootmode="open"><span>blue</span><link rel="stylesheet" href="/c/demo-badge/style.css"></template><demo-card></demo-card></demo-badge>',
    $registry->render('demo-badge', ['slot' => 'x'], '<demo-card></demo-card>', ['theme' => ['color' => 'blue']])
);

[$html, $warnings] = Test::warnings(fn() => $registry->render('demo-loop'));
Test::ok('self-nesting stops with a warning', count($warnings) === 1 && str_contains($warnings[0], 'nesting deeper'), var_export($warnings, true));

Test::section('ComponentRegistry — data');

[$html, $warnings] = Test::warnings(fn() => $registry->render('demo-badge'));
Test::ok('missing context warns', $html !== '' && count($warnings) === 1 && str_contains($warnings[0], "uses context 'theme'"), var_export($warnings, true));

$registry->set_computed('demo-badge', fn(array $_data, array $attrs): array => ['theme' => ['color' => $attrs['tone'] ?? 'none']]);
Test::ok(
    'computed callback gets host attributes and wins',
    str_contains($registry->render('demo-badge', ['tone' => 'green'], '', ['theme' => ['color' => 'blue']]), '<span>green</span>')
);
Test::ok(
    'computed callback runs for nested renders',
    str_contains($registry->render('demo-shell'), '<span>none</span>')
);

Test::same('attributes_to_string', ' hidden data-a="1&quot;"', SWC\Component::attributes_to_string(['hidden' => true, 'gone' => false, 'nil' => null, 'data-a' => '1"']));

Test::section('ComponentRegistry — paths');

$registry = fixture_registry($fixtures);
[, $warnings] = Test::warnings(fn() => $registry->add_path("{$fixtures}/components", '/other'));
Test::ok('duplicate tags warn and keep the first', count($warnings) === 4 && str_contains($registry->preload_tags(), '/c/demo-card/') && !str_contains($registry->preload_tags(), '/other/'), var_export($warnings, true));
Test::ok('has_component', $registry->has_component('demo-card') && !$registry->has_component('nope'));

$stores = new StoreRegistry("{$fixtures}/stores");
[, $warnings] = Test::warnings(fn() => $stores->add_path("{$fixtures}/stores"));
Test::ok('duplicate stores warn and keep the first', count($warnings) === 2 && $stores->get_state('counterStore') === ['count' => 2], var_export($warnings, true));

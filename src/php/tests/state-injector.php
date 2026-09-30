<?php

declare(strict_types=1);

use SWC\StateInjector;

Test::section('StateInjector');

$injector = new StateInjector();
Test::same('no state is an empty object', '<script>window.__SWC_INITIAL_STATE__ = {};</script>', $injector->to_script_tag());

$injector->set('empty', []);
Test::same('empty store state is an object', '<script>window.__SWC_INITIAL_STATE__ = {"empty":{}};</script>', $injector->to_script_tag());

$injector = new StateInjector();
$injector->set('s', json_decode('{"tags":{},"list":[]}'));
Test::same('stdClass keeps nested {} distinct from []', '<script>window.__SWC_INITIAL_STATE__ = {"s":{"tags":{},"list":[]}};</script>', $injector->to_script_tag());

$injector = new StateInjector();
$injector->set('s', ['html' => '</script><script>alert(1)</script>']);
Test::ok('</script> cannot break out', !str_contains($injector->to_script_tag(), '</script><script>'));

$injector = new StateInjector();
$injector->set('s', ['t' => "ok\xB1"]);
[$tag, $warnings] = Test::warnings(fn() => $injector->to_script_tag());
Test::same('invalid UTF-8 is replaced, not fatal', "<script>window.__SWC_INITIAL_STATE__ = {\"s\":{\"t\":\"ok\u{FFFD}\"}};</script>", $tag);
Test::same('invalid UTF-8 does not warn', [], $warnings);

$injector = new StateInjector();
$injector->set('s', ['n' => INF, 'ok' => 1]);
[$tag, $warnings] = Test::warnings(fn() => $injector->to_script_tag());
Test::same('INF becomes 0 and keeps the rest', '<script>window.__SWC_INITIAL_STATE__ = {"s":{"n":0,"ok":1}};</script>', $tag);
Test::ok('INF warns', count($warnings) === 1, var_export($warnings, true));

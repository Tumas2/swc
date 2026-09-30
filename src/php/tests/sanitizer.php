<?php

declare(strict_types=1);

use SWC\Sanitizer;

Test::section('Sanitizer');

$cases = [
    'keeps safe markup'           => ['<p class="a">Hé <b>x</b> <a href="/x">l</a></p>', '<p class="a">Hé <b>x</b> <a href="/x">l</a></p>'],
    'keeps data: images'          => ['<img src="data:image/png;base64,AAAA">', '<img src="data:image/png;base64,AAAA">'],
    'removes script'              => ['a<script>alert(1)</script>b', 'ab'],
    'removes event attributes'    => ['<img src="x.png" onerror="alert(1)">', '<img src="x.png">'],
    'removes javascript: href'    => ['<a href="javascript:alert(1)">x</a>', '<a>x</a>'],
    'removes obfuscated scheme'   => ['<a href=" java&#x09;script:alert(1)">x</a>', '<a>x</a>'],
    'removes vbscript:'           => ['<a href="VBScript:msgbox(1)">x</a>', '<a>x</a>'],
    'removes formaction'          => ['<button formaction="javascript:alert(1)">b</button>', '<button>b</button>'],
    'removes form action'         => ['<form action="javascript:alert(1)"></form>', '<form></form>'],
    'removes svg xlink:href'      => ['<svg><a xlink:href="javascript:alert(1)">s</a></svg>', '<svg><a>s</a></svg>'],
    'removes svg animation'       => ['<svg><a><animate attributeName="href" to="javascript:alert(1)"/><animateMotion/></a></svg>', '<svg><a></a></svg>'],
    'removes base'                => ['<base href="https://evil.example/">x', 'x'],
    'removes iframe and style'    => ['<iframe src="x"></iframe><style>*{}</style>ok', 'ok'],
];

foreach ($cases as $name => [$input, $expected]) {
    Test::same($name, $expected, Sanitizer::clean($input));
}

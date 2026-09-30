<?php

declare(strict_types=1);

/**
 * Test runner for the SWC PHP package. No dependencies.
 *
 *   php tests/run.php
 *
 * The parity tests also need Node.js on PATH; they are skipped without it.
 */

require_once __DIR__ . '/../swc.php';

/**
 * Minimal assertion helpers with pass/fail bookkeeping.
 */
final class Test
{
    private static int $passed = 0;

    /** @var string[] */
    private static array $failures = [];

    /**
     * Prints a section heading.
     *
     * @param string $title
     */
    public static function section(string $title): void
    {
        echo "\n{$title}\n";
    }

    /**
     * Asserts that a condition holds.
     *
     * @param string $name
     * @param bool   $condition
     * @param string $detail Shown when the check fails.
     */
    public static function ok(string $name, bool $condition, string $detail = ''): void
    {
        if ($condition) {
            self::$passed++;
            echo "  ok    {$name}\n";
            return;
        }
        self::$failures[] = $name;
        echo "  FAIL  {$name}\n" . ($detail !== '' ? "        {$detail}\n" : '');
    }

    /**
     * Asserts that two values are identical.
     *
     * @param string $name
     * @param mixed  $expected
     * @param mixed  $actual
     */
    public static function same(string $name, mixed $expected, mixed $actual): void
    {
        self::ok(
            $name,
            $expected === $actual,
            'expected ' . var_export($expected, true) . "\n        actual   " . var_export($actual, true)
        );
    }

    /**
     * Runs $fn and collects any warnings it raises instead of printing them.
     *
     * @param callable $fn
     * @return array{0: mixed, 1: string[]} [return value, warning messages]
     */
    public static function warnings(callable $fn): array
    {
        $warnings = [];
        set_error_handler(static function (int $_level, string $message) use (&$warnings): bool {
            $warnings[] = $message;
            return true;
        });
        try {
            $result = $fn();
        } finally {
            restore_error_handler();
        }
        return [$result, $warnings];
    }

    /**
     * Prints the summary and returns the process exit code.
     *
     * @return int
     */
    public static function finish(): int
    {
        $failed = count(self::$failures);
        echo "\n" . self::$passed . ' passed, ' . $failed . " failed\n";
        return $failed === 0 ? 0 : 1;
    }
}

// Any warning a test did not expect is a failure.
set_error_handler(static function (int $_level, string $message, string $file, int $line): bool {
    Test::ok('no unexpected warnings', false, "{$message} ({$file}:{$line})");
    return true;
});

foreach (['nano-renderer', 'markup', 'template-loader', 'sanitizer', 'state-injector', 'component-registry'] as $suite) {
    require __DIR__ . "/{$suite}.php";
}

exit(Test::finish());

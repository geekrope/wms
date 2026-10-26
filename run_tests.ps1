# Builds and runs node tests (src/tests/test_*.ts).
# Extra args go to node, e.g.: .\run_tests.ps1 --test-name-pattern=bitset
# -c (-Coverage) prints a coverage table for src/*.ts (mapped through source maps)
param([Alias("c")][switch]$Coverage)
Set-Location $PSScriptRoot

tsc -p src/tests
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$coverage_args = @()
if ($Coverage) {
    $coverage_args = @(
        "--experimental-test-coverage",
        "--enable-source-maps",
        "--test-coverage-exclude=dist/tests/**",
        "--test-coverage-exclude=src/tests/**"
    )
}

node --test @coverage_args @args "dist/tests/test_*.js"
exit $LASTEXITCODE

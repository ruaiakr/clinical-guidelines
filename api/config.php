<?php

$localConfigPath = __DIR__ . '/config.local.php';
$defaults = require __DIR__ . '/config.example.php';

if (is_file($localConfigPath)) {
    $localConfig = require $localConfigPath;
    return array_merge($defaults, $localConfig);
}

return $defaults;

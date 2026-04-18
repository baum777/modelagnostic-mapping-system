# scan-path-evaluator

Class: derived.
Use rule: advisory module taxonomy only.

## Purpose

Evaluate how the page is visually scanned.

## Allowed Modes

- audit
- refine

## Required Inputs

- structure
- region weights
- content blocks

## Outputs

- scan path map
- bottlenecks
- redirect suggestions

## Must Not Do

- Assume a scan path that is not supported by the structure.

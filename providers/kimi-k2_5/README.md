# Kimi-K2.5 Provider Adapter

Status: scaffolded.

This directory is the canonical provider-specific export boundary for Kimi K2.5-compatible packaging.

## Current State

- canonical behavior stays in the portable core
- this adapter compiles the portable core into Kimi transport and tool-call packaging

## Non-Goals

- no provider-specific behavior becomes canonical here
- no JSON-mode assumption may bypass shared schema validation


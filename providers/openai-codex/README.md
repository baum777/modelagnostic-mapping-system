# OpenAI-Codex Provider Adapter

Status: scaffolded.

This directory is the canonical provider-specific export boundary for OpenAI Codex-compatible packaging.

## Current State

- canonical behavior stays in the portable core
- this adapter compiles the portable core into the OpenAI/Codex packaging boundary
- `.codex-plugin/plugin.json` remains the compatibility manifest for the legacy Codex package surface

## Non-Goals

- no provider-specific behavior becomes canonical here
- no hidden policy or approval logic is allowed to bypass the shared core


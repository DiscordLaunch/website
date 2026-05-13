import test from 'node:test'
import assert from 'node:assert/strict'
import { decrementReactionText, incrementReactionText } from '../src/reactions.js'

test('increments discord reaction counts while preserving the emoji', () => {
  assert.equal(incrementReactionText('🔥 17'), '🔥 18')
  assert.equal(incrementReactionText('✅ 13'), '✅ 14')
})

test('leaves unexpected reaction text unchanged', () => {
  assert.equal(incrementReactionText('🔥'), '🔥')
  assert.equal(incrementReactionText(''), '')
})

test('decrements discord reaction counts while preserving the emoji', () => {
  assert.equal(decrementReactionText('🔥 18'), '🔥 17')
  assert.equal(decrementReactionText('✅ 14'), '✅ 13')
})

test('does not decrement reaction counts below zero', () => {
  assert.equal(decrementReactionText('🔥 0'), '🔥 0')
})

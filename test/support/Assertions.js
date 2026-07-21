/*
 * Backlog Automation
 * Copyright (C) SonarSource Sàrl
 * mailto: info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import assert from 'node:assert';
import { isDeepStrictEqual } from 'node:util';

export function assertEqual(actual, expected) {
  assert.deepStrictEqual(toComparable(actual), toComparable(expected));
}

export function assertCalledWith(mockFunction, ...expectedArguments) {
  assert.ok(
    mockFunction.mock.calls.some(call => isDeepStrictEqual(call.arguments, expectedArguments)),
    `Expected a matching call among ${mockFunction.mock.callCount()} call(s)`,
  );
}

export function assertCalledWithMatch(mockFunction, expectedPattern) {
  assert.ok(
    mockFunction.mock.calls.some(
      call => typeof call.arguments[0] === 'string' && expectedPattern.test(call.arguments[0]),
    ),
    `Expected a matching call among ${mockFunction.mock.callCount()} call(s)`,
  );
}

function toComparable(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date || value instanceof RegExp || ArrayBuffer.isView(value)) {
    return value;
  }
  if (seen.has(value)) {
    return seen.get(value);
  }
  if (Array.isArray(value)) {
    const result = [];
    seen.set(value, result);
    result.push(...value.map(item => toComparable(item, seen)));
    return result;
  }
  if (value instanceof Map) {
    const result = new Map();
    seen.set(value, result);
    for (const [key, item] of value) {
      result.set(toComparable(key, seen), toComparable(item, seen));
    }
    return result;
  }
  if (value instanceof Set) {
    const result = new Set();
    seen.set(value, result);
    for (const item of value) {
      result.add(toComparable(item, seen));
    }
    return result;
  }

  const result = {};
  seen.set(value, result);
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined) {
      result[key] = toComparable(item, seen);
    }
  }
  return result;
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { Bitset } from "../algorithms/bitset.js";

test("bitset page overflow", () => {
    const bitset = new Bitset();

    bitset.set_bit(64); // make a bitset allocate one intermediate page
    assert.equal(bitset.data.length, 3);
    assert.equal(bitset.read_bit(64), 1);
})

test("bitset or broadcasting", () => {
    const bitset1 = new Bitset();
    const bitset2 = new Bitset();

    bitset1.set_bit(64); // 3 pages
    bitset2.set_bit(96); // 4 pages

    const or = bitset1.or(bitset2);
    
    assert.equal(bitset1.data.length, 3);
    assert.equal(bitset2.data.length, 4);
    
    assert.equal(or.read_bit(64), 1);
    assert.equal(or.read_bit(96), 1);

    assert.equal(or.data.length, 4);

    assert.equal(or.read_bit(65), 0);
    assert.equal(or.read_bit(0), 0);
})

test("bitset or commutativity", () => {
    const shorter = new Bitset();
    const longer = new Bitset();

    shorter.set_bit(3);
    shorter.set_bit(31); // sign bit of the shared page
    longer.set_bit(3);   // overlapping bit
    longer.set_bit(40);
    longer.set_bit(96);

    // argument shorter than the receiver hits the other side of ?? 0
    assert.deepEqual(shorter.or(longer).data, longer.or(shorter).data);
    assert.deepEqual(longer.or(shorter).apply(Array(128).fill(0).map((_, i) => i)), [3, 31, 40, 96]);
})

test("bitset apply", () => {
    const array = Array(32).fill(0).map((_, i) => i);
    const bitset = new Bitset();

    bitset.set_bit(15);
    bitset.set_bit(16);
    bitset.set_bit(20);

    assert.deepEqual(bitset.apply(array), [15, 16, 20]);
})

test("bitset apply broadcasting", () => {
    const array = Array(32).fill(0).map((_, i) => i);
    const bitset = new Bitset();

    bitset.set_bit(15);
    bitset.set_bit(16);
    bitset.set_bit(20);
    bitset.set_bit(32);

    assert.deepEqual(bitset.apply(array), [15, 16, 20]);
})

test("bitset duplicate set", () => {
    const bitset = new Bitset();

    bitset.set_bit(16);
    bitset.set_bit(16);

    assert.equal(bitset.read_bit(16), 1);
    assert.equal(bitset.data[0], 1 << 16);
})

test("bitset sign bit", () => {
    const array = Array(40).fill(0).map((_, i) => i);
    const bitset = new Bitset();

    bitset.set_bit(31); // 1 << 31 is negative, apply shifts it with sign extension
    bitset.set_bit(32);

    assert.equal(bitset.read_bit(30), 0);
    assert.equal(bitset.read_bit(31), 1);
    assert.equal(bitset.read_bit(32), 1);
    assert.equal(bitset.read_bit(33), 0);
    assert.deepEqual(bitset.apply(array), [31, 32]);
})

test("bitset read out of range", () => {
    const bitset = new Bitset();

    assert.equal(bitset.read_bit(1000), 0);

    bitset.set_bit(3);
    assert.equal(bitset.read_bit(1000), 0);
    assert.equal(bitset.data.length, 1); // reading does not allocate
})
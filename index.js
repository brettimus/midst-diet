const fs = require('fs');
const { EditorState, convertToRaw, convertFromRaw } = require('draft-js');
const { map, has, pick, filter, omitBy, uniq, isEmpty, keys, reduce, isEqual, difference } = require('lodash');

let filename = process.argv[2];
console.log('filename', filename);
const file = fs.readFileSync(filename || '/Users/boots/midst-diet/hi-annelyse.mds', 'utf8');

// 'raw' editor states, just JSON
const rawSnapshots = JSON.parse(file);
const rawLastSnapshot = rawSnapshots[rawSnapshots.length - 1];


const isEqualToLast = (current, i, ary) => {
  if (i === 0) {
    return false;
  }
  return isEqual(current, ary[i - 1]);
}

const isNotEqualToLast = (...args) => {
  return !isEqualToLast(...args);
}

const getBlockDiff = (old, current) => {
  const allKeys = uniq([...keys(old), ...keys(current)]);

  const diffsByKey = reduce(allKeys, (result, key) => {
    if (has(current, key) && has(old, key)) {
      if (!isEqual(current[key], old[key])) {
        result.changed.push(key);        
      }
      return result;
    }
    if (has(old, key)) {
      result.removed.push(key);
      return result;
    }
    if (has(current, key)) {
      result.added.push(key);
      return result;
    }
    return result;
  }, { changed: [], added: [], removed: [] });

  const { added, removed, changed } = diffsByKey;

  const diffSummary = {
    changed: pick(old, changed),
    added: pick(current, added),
    removed: pick(old, removed)
  }

  return omitBy(diffSummary, isEmpty);
}

const getBlockDiffMapper = (current, i, ary) => {
  if (i === 0) {
    return null;
  }
  const last = ary[i-1];
  const currentBM = (current.blockMap || current.blocks);
  const lastBM = (last.blockMap || last.blocks);

  const diff = getBlockDiff(lastBM, currentBM);

  return diff;
}

      // console.log('this editor state', latestSnapshot.toJSON().blockMap);


// running script
if (filename) {
  const slimmerSnapshots = rawSnapshots.filter(isNotEqualToLast);
  const slimmerFilename = filename.replace('.mds', '-slim.mds');
  fs.writeFileSync(slimmerFilename, JSON.stringify(slimmerSnapshots), 'utf8');
  process.exit(0);
}

// loading playground

const snapshots = rawSnapshots.map(s => convertFromRaw(s));
const lastSnapshot = snapshots[snapshots.length - 1];

const states = snapshots.map(s => EditorState.createWithContent(s));
const lastState = states[states.length - 1];

const diffSummaries = snapshots.map(s => s.toJSON()).map(getBlockDiffMapper);

// NOTE - re-hydrating does not give us what we need
// NOTE - we are not keeping undo stack


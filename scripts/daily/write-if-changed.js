// ProtoConsent data pipeline
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Conditional write helper - only overwrites output file if content
// (excluding generated/version metadata) actually changed.

const fs = require("fs");
const path = require("path");

function writeIfChanged(outPath, newData, opts) {
  const indent = (opts && opts.indent) || 0;
  const suffix = (opts && opts.suffix) || "";
  const force = (opts && opts.force) || false;

  if (!force) {
    let existing = null;
    try {
      existing = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    } catch (_) {
      // File doesn't exist or is invalid - always write
    }

    if (existing) {
      const strip = (obj) => {
        const copy = { ...obj };
        delete copy.generated;
        delete copy.version;
        return copy;
      };
      const oldContent = JSON.stringify(strip(existing));
      const newContent = JSON.stringify(strip(newData));
      if (oldContent === newContent) {
        return { written: false, path: outPath };
      }
    }
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(newData, null, indent) + suffix, "utf-8");
  return { written: true, path: outPath };
}

module.exports = { writeIfChanged };

import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const gradleFile = resolve(
  'node_modules',
  'onnxruntime-react-native',
  'android',
  'build.gradle',
);

if (!existsSync(gradleFile)) {
  process.exit(0);
}

const source = readFileSync(gradleFile, 'utf8');
const before =
  'if (VersionNumber.parse(REACT_NATIVE_VERSION) < VersionNumber.parse("0.71"))';
const after = 'if (REACT_NATIVE_MINOR_VERSION < 71)';

if (source.includes(before)) {
  writeFileSync(gradleFile, source.replace(before, after));
  console.log('Patched onnxruntime-react-native Gradle VersionNumber usage.');
}

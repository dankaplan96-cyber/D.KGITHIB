// run a test with a scratch working directory (tests write their screenshots to the working directory);
// the test's own arguments follow its path (process.argv[2] is a locale for some tests: the path is taken out)
process.chdir('/dev/shm/gatefix/cwd');
const test = process.argv.splice(2, 1)[0];
await import(test);

process.env.PORT = '3001';
process.env.ISOLATED_TEST = 'true';
process.env.DATA_PATH = 'scratch/isolated-test-data.json';
import('../server.mjs');

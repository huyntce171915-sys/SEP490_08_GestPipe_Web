const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Try to find Python executable
let PYTHON_BIN = process.env.PYTHON_BIN;

if (!PYTHON_BIN || !fs.existsSync(PYTHON_BIN)) {
  // Priority 1: Look for a virtual environment inside the project (Best practice for portability)
  // Assuming .venv is at the project root or backend root
  const venvPath = path.resolve(__dirname, '../../../../.venv/Scripts/python.exe');
  
  // Priority 2: Common System Paths (Generic, not user-specific)
  const possiblePaths = [
    venvPath, 
    'python.exe', // System PATH
    'python3.exe',
    'py.exe'
  ];

  for (const testPath of possiblePaths) {
    try {
      if (fs.existsSync(testPath) || !testPath.includes('\\')) { // Exists or is a command like 'python.exe'
        PYTHON_BIN = testPath;
        break;
      }
    } catch (e) {
      // Continue
    }
  }
  
  PYTHON_BIN = PYTHON_BIN || 'python.exe';
}

const runPythonScript = (scriptName, args, workingDir) => {
  return new Promise((resolve, reject) => {
    // console.log(
    //   `[runPythonScript] PYTHON_BIN: ${PYTHON_BIN}, Spawning: ${PYTHON_BIN} ${scriptName} ${args.join(' ')} in ${workingDir}`
    // );

    const pythonProcess = spawn(PYTHON_BIN, [scriptName, ...args], {
      cwd: workingDir,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',  // Force UTF-8 mode
        PATH: process.env.PATH,  // Ensure PATH is included
      },
      // Remove shell to spawn python directly
      // shell: true,
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      // console.log(`[${scriptName} STDOUT]: ${data.toString().trim()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(`[${scriptName} STDERR]: ${data.toString().trim()}`);
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(`Script ${scriptName} exited with code ${code}`);
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });

    pythonProcess.on('error', (err) => {
      console.error(`[${scriptName}] Failed to start subprocess.`, err);
      reject(err);
    });
  });
};

module.exports = {
  runPythonScript,
  PYTHON_BIN,
};

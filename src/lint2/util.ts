import * as cp from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';

//
// Promise wapper around cp.execFile. This is strucuted to take a single Args
// object as input and returns a single Output object with the results. This
// makes it a bit easier for callers to use execFile.
//

// input
export interface ExecFileArgs {
	command: string;
	args: string[];
	options: cp.ExecFileOptions;
	stdin?: string;
}

// output
export interface ExecFileOutput {
	stdout: string;
	stderr: string;
	error?: Error;
}

export function execFile(args: ExecFileArgs): Promise<ExecFileOutput> {
	return new Promise((resolve: any, reject: any): void => {
		const child: cp.ChildProcess = cp.execFile(
			args.command,
			args.args,
			args.options,
			(error: Error, stdout: string, stderr: string) => {
				resolve({ stdout, stderr, error });
			}
		);

		// apply stdin if present
		child.stdin.end(args.stdin || '');
	});
}

// Is this file readable?
export async function isReadable(file: string): Promise<boolean> {
	try {
		await fs.access(file, fs.constants.R_OK);
	} catch (e) {
		return false;
	}
	return true;
}

// Look in dir (and above) for a file
export async function lookUpward(srcDir: string, file: string): Promise<string | undefined> {
	let dir: string = srcDir;

	// tslint:disable-next-line no-constant-condition
	while (true) {
		const checkFile: string = path.join(dir, file);
		if (await isReadable(checkFile)) {
			// success!
			return checkFile;
		}
		const parentDir: string = path.dirname(dir);
		if (parentDir === dir) {
			// failure
			return undefined;
		}
		dir = parentDir;
	}
}

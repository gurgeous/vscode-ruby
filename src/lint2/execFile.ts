import * as cp from 'child_process';

//
// Promise wapper around cp.execFile. This is strucuted to take a single Args
// object as input and returns a single Output object with the results. This
// makes it a bit easier for callers to use execFile.
//

// input
export interface Args {
	command: string;
	args: string[];
	options: cp.ExecFileOptions;
	stdin?: string;
}

// output
export interface Output {
	stdout: string;
	stderr: string;
	error?: Error;
}

export function execFile(args: Args): Promise<Output> {
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
		if (args.stdin) {
			child.stdin.end(args.stdin);
		}
	});
}

import * as cp from 'child_process';

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

// Promise wapper around cp.execFile.
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

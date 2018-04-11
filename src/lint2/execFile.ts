import * as cp from 'child_process';

export interface Results {
	stdout: string;
	stderr: string;
	error?: Error;
}

// promise wapper around cp.execFile
export function execFile(
	command: string,
	args: string[],
	options: cp.ExecFileOptions,
	stdin?: string
): Promise<Results> {
	return new Promise((resolve: any, reject: any): void => {
		const child: cp.ChildProcess = cp.execFile(
			command,
			args,
			options,
			(error: Error, stdout: string, stderr: string) => {
				resolve({ stdout, stderr, error });
			}
		);

		// apply stdin if present
		if (stdin) {
			child.stdin.end(stdin);
		}
	});
}

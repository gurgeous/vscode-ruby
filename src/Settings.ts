/**
 * Generated with json-schema-to-typescript, then modified.
 */

export interface Settings {
	/**
	 * Defines where the Ruby extension will look to find Modules, Classes and methods.
	 */
	locate?: {
		/**
		 * glob pattern to select files to parse. Matches are performed against the
		 * path relative to the workspace root
		 */
		include?: string;

		/**
		 * glob pattern to select files to ignore, this is also run against paths
		 * for exclusion from walking. Matches are performed against the path
		 * relative to the workspace root
		 */
		exclude?: string;
	};

	interpreter?: {
		/**
		 * Path to the Ruby interpreter.  Set this to an absolute path to select
		 * from multiple installed Ruby versions.
		 */
		commandPath?: string;
	};

	/**
	 * Method to use for code completion. Use `false` to disable or if another
	 * extension provides this feature.
	 */
	codeCompletion?: false | 'rcodetools';

	/**
	 * Method to use for intellisense (go to definition, etc.). Use `false` to
	 * disable or if another extension provides this feature.
	 */
	intellisense?: false | 'rubyLocate';

	/**
	 * Whether ruby tools should be started using Bundler
	 */
	useBundler?: boolean;

	/**
	 * Path to the bundler executable (used if useBundler is true)
	 */
	pathToBundler?: string;

	rctComplete?: {
		/**
		 * Path to the rct-complete command.  Set this to an absolute path to select
		 * from multiple installed Ruby versions.
		 */
		commandPath?: string;
	};

	/**
	 * Time (ms) to wait after keypress before running enabled linters. Ensures
	 * linters are only run when typing has finished and not for every keypress
	 */
	lintDebounceTime?: number;

	/**
	 * Run the linter on save (onSave) or on type (onType).
	 */
	lintRun: 'onSave' | 'onType';

	/**
	 * Set individual ruby linters to use
	 */
	lint?: {
		/**
		 * Use fasterer to lint
		 */
		fasterer?: boolean;

		/**
		 * Use reek to lint
		 */
		reek?: boolean;

		/**
		 * Use RuboCop to lint
		 */
		rubocop?:
			| boolean
			| {
					[k: string]: any;
			  };
	};

	/**
	 * Which system to use for formatting. Use `false` to disable or if another
	 * extension provides this feature.
	 */
	format?: false | 'rubocop';

	[key: string]: any;
}

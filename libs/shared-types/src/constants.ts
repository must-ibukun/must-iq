export const ALLOWED_FILE_EXTENSIONS = [
  // Web / JS ecosystem
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte',
  // Systems / compiled
  '.py', '.go', '.java', '.kt', '.kts', '.swift', '.dart',
  '.cpp', '.c', '.h', '.rs', '.cs',
  // Web markup & styles
  '.html', '.css', '.scss', '.sass',
  // Scripting
  '.php', '.rb', '.sh', '.bash',
  // Data / config
  '.json', '.yaml', '.yml', '.toml', '.xml', '.sql',
  // API schemas
  '.graphql', '.gql', '.proto',
  // Docs
  '.md', '.mdx', '.txt',
  // Templates (NestJS email/view templates)
  '.ejs',
];

export const CODE_EXTENSIONS: Record<string, string> = {
  // JS ecosystem — LangChain only supports "js"; "ts" is not in its list
  // TypeScript uses the JS splitter (same separators, works correctly)
  ".ts": "js",
  ".tsx": "js",
  ".js": "js",
  ".jsx": "js",
  ".mjs": "js",
  ".cjs": "js",
  ".vue": "html",
  ".svelte": "html",
  // Systems
  ".py": "python",
  ".go": "go",
  ".java": "java",
  ".kt": "kotlin",
  ".kts": "kotlin",
  ".swift": "swift",
  ".dart": "dart",
  ".cpp": "cpp",
  ".c": "c",
  ".h": "cpp",
  ".rs": "rust",
  ".cs": "csharp",
  // Web markup & styles
  ".html": "html",
  ".css": "css",
  ".scss": "css",
  ".sass": "css",
  // Scripting
  ".php": "php",
  ".rb": "ruby",
  ".sh": "bash",
  ".bash": "bash",
  // Data / config
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "toml",
  ".xml": "xml",
  ".sql": "sql",
  // API schemas
  ".graphql": "graphql",
  ".gql": "graphql",
  ".proto": "proto",       // LangChain supports "proto", not "protobuf"
  // Docs — LangChain supports "markdown" natively
  ".md": "markdown",
  ".mdx": "markdown",
};

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'application/zip',
  'application/x-zip-compressed'
];

export const IGNORED_DIRECTORIES = [
  // JS / Node
  'node_modules', 'dist', 'build', '.nx',
  // Git / CI
  '.git', '.github', '.husky',
  // Test directories
  '__tests__', '__mocks__', 'test', 'integration_test', 'e2e',
  // Editor
  '.vscode', '.idea',
  // iOS — CocoaPods dependency folder (can be hundreds of MB)
  'Pods',
  // Android build output
  'generated', '.gradle',
  // Flutter build
  '.dart_tool', '.pub-cache',
  // Misc
  'coverage', 'logs',
];

export const IGNORED_FILE_PATTERNS = [
  // Test files
  '.test.', '.spec.', '-test.', '-spec.', '.stories.',
  // Flutter test files
  '_test.dart', '_tests.dart',
  // Config / secrets — never ingest these
  'google-services.json', 'GoogleService-Info.plist',
  'pubspec.yaml', 'pubspec.lock',
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  // Source maps — noise, not useful for search
  '.js.map', '.ts.map',
];
export const MAX_FILE_SIZE_MB = 2000;

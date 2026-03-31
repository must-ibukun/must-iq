export const ALLOWED_FILE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte',
  '.py', '.go', '.java', '.kt', '.kts', '.swift', '.dart',
  '.cpp', '.c', '.h', '.rs', '.cs',
  '.html', '.css', '.scss', '.sass',
  '.php', '.rb', '.sh', '.bash',
  '.json', '.yaml', '.yml', '.toml', '.xml', '.sql',
  '.graphql', '.gql', '.proto',
  '.md', '.mdx', '.txt',
  '.ejs',
];

export const CODE_EXTENSIONS: Record<string, string> = {
  // LangChain only supports "js"; TypeScript uses the JS splitter (same separators, works correctly)
  ".ts": "js",
  ".tsx": "js",
  ".js": "js",
  ".jsx": "js",
  ".mjs": "js",
  ".cjs": "js",
  ".vue": "html",
  ".svelte": "html",
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
  ".html": "html",
  ".css": "css",
  ".scss": "css",
  ".sass": "css",
  ".php": "php",
  ".rb": "ruby",
  ".sh": "bash",
  ".bash": "bash",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "toml",
  ".xml": "xml",
  ".sql": "sql",
  ".graphql": "graphql",
  ".gql": "graphql",
  ".proto": "proto",   // LangChain supports "proto", not "protobuf"
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
  'node_modules', 'dist', 'build', '.nx',
  '.git', '.github', '.husky',
  '__tests__', '__mocks__', 'test', 'integration_test', 'e2e',
  '.vscode', '.idea',
  'Pods',   // iOS CocoaPods dependency folder (can be hundreds of MB)
  'generated', '.gradle',
  '.dart_tool', '.pub-cache',
  'coverage', 'logs',
];

export const IGNORED_FILE_PATTERNS = [
  '.test.', '.spec.', '-test.', '-spec.', '.stories.',
  '_test.dart', '_tests.dart',
  'google-services.json', 'GoogleService-Info.plist',
  'pubspec.yaml', 'pubspec.lock',
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  '.js.map', '.ts.map',
];
export const MAX_FILE_SIZE_MB = 2000;

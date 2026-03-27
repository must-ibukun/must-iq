export const ALLOWED_FILE_EXTENSIONS = [
  // Web / JS ecosystem
  '.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte',
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
  '.md', '.txt',
];

export const CODE_EXTENSIONS: Record<string, string> = {
  // JS ecosystem
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
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
  ".proto": "protobuf",
};

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'application/zip',
  'application/x-zip-compressed'
];

export const IGNORED_DIRECTORIES = ['node_modules', '.git', 'dist', 'build', '.nx', '__tests__', '__mocks__', 'test', '.github', '.husky', '.vscode'];
export const IGNORED_FILE_PATTERNS = ['.test.', '.spec.', '-test.', '-spec.', '.stories.', '_test.dart', '_tests.dart', 'google-services.json', 'GoogleService-Info.plist',
  'pubspec.yaml', 'pubspec.lock', 'package-lock.json'];
export const MAX_FILE_SIZE_MB = 2000;

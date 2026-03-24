export const ALLOWED_FILE_EXTENSIONS = [
  '.ts', '.js', '.py', '.go', '.md', '.txt', '.json', '.yaml', '.yml',
  '.cpp', '.h', '.java', '.tsx', '.jsx', '.c', '.html', '.php', '.rb', '.rs'
];

export const CODE_EXTENSIONS: Record<string, string> = {
  ".ts": "js",
  ".tsx": "js",
  ".js": "js",
  ".jsx": "js",
  ".py": "python",
  ".go": "go",
  ".java": "java",
  ".cpp": "cpp",
  ".h": "cpp",
  ".html": "html",
  ".php": "php",
  ".rb": "ruby",
  ".rs": "rust"
};

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'application/zip',
  'application/x-zip-compressed'
];


export const IGNORED_DIRECTORIES = ['node_modules', '.git', 'dist', 'build', '.nx', 'dist', '__tests__', '__mocks__', 'test', '.github', '.husky', '.vscode',];
export const IGNORED_FILE_PATTERNS = ['.test.', '.spec.', '-test.', '-spec.', '.stories.', '_test.dart', '_tests.dart', 'google-services.json', 'GoogleService-Info.plist',
  'pubspec.yaml', 'pubspec.lock', 'package-lock.json'];
export const MAX_FILE_SIZE_MB = 2000;

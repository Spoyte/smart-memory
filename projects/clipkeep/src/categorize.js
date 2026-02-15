// Content categorization logic

const PATTERNS = {
  url: /^https?:\/\/[^\s]+$/i,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/,
  ip: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
};

function detectCode(content) {
  // Heuristics for code detection
  const codeIndicators = [
    /^(const|let|var|function|class|import|export)\s/m,
    /^(def|class|import|from)\s/m,
    /[{};]\s*$/m,  // Lines ending with braces or semicolons
    /^(#include|#define|int|void|char|float|double)\s/m,
    /\(\s*\)\s*\{/m,  // Function definitions
    /^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP)\s/mi,  // SQL
    /^(\$|\u003e|\u003c|\[|\{).*$/m,  // JSON, shell, etc.
  ];
  
  const lines = content.split('\n');
  let codeScore = 0;
  
  for (const pattern of codeIndicators) {
    if (pattern.test(content)) codeScore++;
  }
  
  // High ratio of special characters suggests code
  const specialChars = (content.match(/[{};()=\[\]<>]/g) || []).length;
  const specialRatio = specialChars / content.length;
  if (specialRatio > 0.1) codeScore++;
  
  // Multiple lines with consistent indentation
  const indentedLines = lines.filter(l => l.match(/^(  |\t)/)).length;
  if (lines.length > 2 && indentedLines / lines.length > 0.5) codeScore++;
  
  return codeScore >= 2;
}

function detectAddress(content) {
  // Simple address detection
  const addressPatterns = [
    /\d+\s+\w+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct)/i,
    /\b\d{5}(-\d{4})?\b/,  // ZIP code
    /\b(Apt|Suite|Unit|#)\s*\d+/i,
  ];
  
  return addressPatterns.some(p => p.test(content));
}

function categorize(content) {
  const trimmed = content.trim();
  
  if (!trimmed) return 'empty';
  
  // Single-line checks
  const lines = trimmed.split('\n');
  const firstLine = lines[0].trim();
  
  if (PATTERNS.url.test(firstLine) && lines.length === 1) {
    return 'url';
  }
  
  if (PATTERNS.email.test(firstLine) && lines.length === 1) {
    return 'email';
  }
  
  if (PATTERNS.phone.test(firstLine) && lines.length === 1) {
    return 'phone';
  }
  
  if (PATTERNS.ip.test(firstLine) && lines.length === 1) {
    return 'ip';
  }
  
  if (PATTERNS.hexColor.test(firstLine) && lines.length === 1) {
    return 'color';
  }
  
  if (detectCode(trimmed)) {
    return 'code';
  }
  
  if (detectAddress(trimmed)) {
    return 'address';
  }
  
  return 'text';
}

function getCategoryIcon(category) {
  const icons = {
    url: '🔗',
    email: '📧',
    phone: '📞',
    ip: '🌐',
    color: '🎨',
    code: '💻',
    address: '📍',
    text: '📝',
    empty: '⚪',
  };
  return icons[category] || '📄';
}

function truncate(str, maxLen = 80) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

function formatPreview(content, maxLines = 3) {
  const lines = content.split('\n');
  if (lines.length <= maxLines) return content;
  return lines.slice(0, maxLines).join('\n') + '\n...';
}

module.exports = {
  categorize,
  getCategoryIcon,
  truncate,
  formatPreview,
  PATTERNS
};

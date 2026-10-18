/**
 * @deprecated Legacy hardcoded GitHub-course catalog. The live catalog is the
 * `platform_courses` table (admin-managed / courses-import). This module is
 * kept only for historical reference and is no longer imported by any route.
 */
export interface CatalogCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  source: string;       // GitHub repo URL
  stars: string;        // approximate stars label
  prompt: string;       // the requirement text to feed into OpenMAIC generation
  language: string;
}

export const CATALOG_COURSES: CatalogCourse[] = [
  {
    id: 'python-basics',
    title: 'Python Programming Basics',
    description: 'Learn Python from scratch: variables, loops, functions, data structures, and OOP.',
    category: 'Programming',
    source: 'https://github.com/freeCodeCamp/freeCodeCamp',
    stars: '400k+',
    prompt: 'Teach me Python programming basics from scratch: variables, data types, loops, functions, lists/dicts, and basic OOP. Include coding exercises and quizzes.',
    language: 'English',
  },
  {
    id: 'cs-self-learning-cn',
    title: 'CS Self-Learning Guide (Chinese)',
    description: 'A structured Chinese-language guide to learning computer science: OS, networks, algorithms, databases.',
    category: 'Computer Science',
    source: 'https://github.com/PKUFlyingPig/cs-self-learning',
    stars: '50k+',
    prompt: '用中文讲解计算机科学核心知识体系：操作系统、计算机网络、数据结构与算法、数据库。每个主题用通俗语言解释，并配有测验。',
    language: '中文',
  },
  {
    id: 'ai-for-beginners',
    title: 'AI for Beginners',
    description: 'Microsoft\'s 12-week curriculum: from symbolic AI to deep learning, RL, and multi-agent systems.',
    category: 'AI & Machine Learning',
    source: 'https://github.com/microsoft/AI-For-Beginners',
    stars: '63k+',
    prompt: 'Teach me AI fundamentals: what is AI, machine learning basics, neural networks overview, and how LLMs work. Include interactive examples and quizzes.',
    language: 'English',
  },
  {
    id: 'web-dev-basics',
    title: 'Web Development Basics',
    description: 'HTML, CSS, JavaScript fundamentals for building modern websites from scratch.',
    category: 'Programming',
    source: 'https://github.com/freeCodeCamp/freeCodeCamp',
    stars: '400k+',
    prompt: 'Teach me web development basics: HTML structure, CSS styling, and JavaScript fundamentals. Include hands-on coding exercises and quizzes.',
    language: 'English',
  },
  {
    id: 'data-structures-algorithms',
    title: 'Data Structures & Algorithms',
    description: 'Arrays, linked lists, trees, graphs, sorting, searching, and big-O notation.',
    category: 'Computer Science',
    source: 'https://github.com/jwasham/coding-interview-university',
    stars: '300k+',
    prompt: 'Teach me data structures and algorithms: arrays, linked lists, hash tables, trees, graphs, sorting algorithms, and big-O complexity. Include coding challenges.',
    language: 'English',
  },
  {
    id: 'sql-basics',
    title: 'SQL & Databases Basics',
    description: 'Learn SQL queries, database design, joins, indexes, and normalization.',
    category: 'Data',
    source: 'https://github.com/ossu/databases',
    stars: '60k+',
    prompt: 'Teach me SQL basics: SELECT, INSERT, JOIN, GROUP BY, indexes, and database normalization. Include practice queries and quizzes.',
    language: 'English',
  },
  {
    id: 'chinese-literature',
    title: '中国古代文学常识',
    description: '中国古代文学经典：诗经、唐诗、宋词、四大名著导读。',
    category: '人文',
    source: 'open source curriculum',
    stars: ' curated',
    prompt: '用中文讲解中国古代文学常识：诗经、唐诗宋词代表人物与作品、四大名著导读。包含文学常识测验。',
    language: '中文',
  },
  {
    id: 'marketing-fundamentals',
    title: 'Digital Marketing Fundamentals',
    description: 'SEO, content marketing, social media, email marketing, and analytics basics.',
    category: 'Business',
    source: 'open source curriculum',
    stars: ' curated',
    prompt: 'Teach me digital marketing fundamentals: SEO, content marketing, social media strategy, email marketing, and basic analytics. Include quizzes.',
    language: 'English',
  },
];

import type {ReactNode} from 'react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import {
  checkApiHealth,
  checkAuth,
  getChapter,
  listChapters,
  login,
  logout,
  saveChapter,
  type ChapterDetail,
  type ChapterSummary,
} from '@site/src/lib/adminApi';
import styles from './admin.module.css';

export default function AdminPage(): ReactNode {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [chapters, setChapters] = useState<ChapterSummary[]>([]);
  const [selectedPath, setSelectedPath] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<ChapterDetail | null>(
    null,
  );
  const [title, setTitle] = useState('');
  const [sidebarPosition, setSidebarPosition] = useState('');
  const [body, setBody] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  const loadChapters = useCallback(async () => {
    const items = await listChapters();
    setChapters(items);
  }, []);

  useEffect(() => {
    checkApiHealth()
      .then(setApiOnline)
      .catch(() => setApiOnline(false));

    checkAuth()
      .then((isAuthed) => {
        setAuthenticated(isAuthed);
        if (isAuthed) {
          return loadChapters();
        }
        return undefined;
      })
      .catch(() => setAuthenticated(false));
  }, [loadChapters]);

  const categories = useMemo(() => {
    return ['all', ...new Set(chapters.map((chapter) => chapter.category))];
  }, [chapters]);

  const filteredChapters = useMemo(() => {
    const query = search.trim().toLowerCase();
    return chapters.filter((chapter) => {
      const matchesCategory =
        category === 'all' || chapter.category === category;
      const matchesSearch =
        query === '' ||
        chapter.title.toLowerCase().includes(query) ||
        chapter.path.toLowerCase().includes(query) ||
        chapter.category.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [category, chapters, search]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(password);
      setAuthenticated(true);
      setPassword('');
      await loadChapters();
      setMessage('Signed in successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    setAuthenticated(false);
    setSelectedChapter(null);
    setSelectedPath('');
    setChapters([]);
    setMessage('Signed out.');
  }

  async function handleSelectChapter(path: string) {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const chapter = await getChapter(path);
      setSelectedPath(path);
      setSelectedChapter(chapter);
      setTitle(chapter.title);
      setSidebarPosition(chapter.sidebar_position ?? '');
      setBody(chapter.body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load chapter');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPath) {
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      await saveChapter({
        path: selectedPath,
        title,
        body,
        sidebar_position: sidebarPosition,
      });
      setMessage(
        'Chapter saved. Run "npm run build" to publish changes to the app.',
      );
      await loadChapters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save chapter');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout
      title="Admin"
      description="Manage Kiribati Clinical Guidelines chapter content.">
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Content Admin</h1>
              <p className={styles.subtitle}>
                Update chapter text for the clinical manual. Changes are saved
                to the source markdown files.
              </p>
            </div>
            {authenticated ? (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleLogout}>
                Sign out
              </button>
            ) : null}
          </div>

          {authenticated === null ? (
            <div className={styles.card}>Checking access…</div>
          ) : null}

          {authenticated === false ? (
            <form className={`${styles.card} ${styles.loginCard}`} onSubmit={handleLogin}>
              <label className={styles.label} htmlFor="admin-password">
                Admin password
              </label>
              <input
                id="admin-password"
                className={styles.input}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter admin password"
                autoComplete="current-password"
              />
              <div className={styles.actions}>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={loading || password === ''}>
                  Sign in
                </button>
              </div>
              <div className={styles.notice}>
                Password file: <code>api/config.local.php</code> (not{' '}
                <code>config.example.php</code>). Restart is not required after
                changing the password.
              </div>
              {apiOnline === false ? (
                <div className={styles.error}>
                  Admin API is offline. In a terminal, run{' '}
                  <code>npm run admin-api</code> (or use <code>npm start</code>{' '}
                  which starts it automatically). Then open{' '}
                  <a
                    href="http://127.0.0.1:8787/health.php"
                    target="_blank"
                    rel="noreferrer">
                    the API health check
                  </a>{' '}
                  — you should see <code>{'{"ok":true}'}</code>.
                </div>
              ) : null}
              {error ? <div className={styles.error}>{error}</div> : null}
            </form>
          ) : null}

          {authenticated ? (
            <div className={styles.grid}>
              <section className={styles.card}>
                <div className={styles.toolbar}>
                  <input
                    className={`${styles.input} ${styles.search}`}
                    type="search"
                    placeholder="Search chapters"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <div className={styles.toolbar}>
                  <select
                    className={styles.select}
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}>
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {item === 'all' ? 'All categories' : item}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.chapterList}>
                  {filteredChapters.map((chapter) => (
                    <button
                      key={chapter.path}
                      type="button"
                      className={`${styles.chapterButton} ${
                        selectedPath === chapter.path
                          ? styles.chapterButtonActive
                          : ''
                      }`}
                      onClick={() => handleSelectChapter(chapter.path)}>
                      <span className={styles.chapterTitle}>
                        {chapter.title}
                      </span>
                      <span className={styles.chapterMeta}>
                        {chapter.category}
                      </span>
                    </button>
                  ))}
                  {filteredChapters.length === 0 ? (
                    <div className={styles.emptyState}>
                      No chapters match your search.
                    </div>
                  ) : null}
                </div>
              </section>

              <section className={styles.card}>
                {selectedChapter ? (
                  <form onSubmit={handleSave}>
                    <div className={styles.editorHeader}>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor="chapter-title">
                          Chapter title
                        </label>
                        <input
                          id="chapter-title"
                          className={styles.input}
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                        />
                      </div>
                      <div className={styles.field}>
                        <label
                          className={styles.label}
                          htmlFor="chapter-position">
                          Sidebar position
                        </label>
                        <input
                          id="chapter-position"
                          className={styles.input}
                          value={sidebarPosition}
                          onChange={(event) =>
                            setSidebarPosition(event.target.value)
                          }
                        />
                      </div>
                    </div>

                    <label className={styles.label} htmlFor="chapter-body">
                      Chapter content (Markdown)
                    </label>
                    <textarea
                      id="chapter-body"
                      className={styles.textarea}
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                    />

                    <div className={styles.actions}>
                      <button
                        type="submit"
                        className={styles.primaryButton}
                        disabled={loading}>
                        Save chapter
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className={styles.emptyState}>
                    Select a chapter from the list to edit its content.
                  </div>
                )}

                {message ? <div className={styles.success}>{message}</div> : null}
                {error ? <div className={styles.error}>{error}</div> : null}
              </section>
            </div>
          ) : null}
        </div>
      </main>
    </Layout>
  );
}

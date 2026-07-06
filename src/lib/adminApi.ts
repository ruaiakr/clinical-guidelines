import siteConfig from '@generated/docusaurus.config';

export type ChapterSummary = {
  path: string;
  id: string;
  title: string;
  category: string;
  sidebar_position?: string;
  modified: string;
};

export type ChapterDetail = ChapterSummary & {
  meta: Record<string, string>;
  body: string;
  content: string;
};

function getApiBaseUrl(): string {
  const url = siteConfig.customFields?.adminApiUrl;
  return typeof url === 'string' ? url.replace(/\/$/, '') : '/api';
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}/${endpoint}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      ...options,
    });
  } catch {
    throw new Error(
      `Cannot reach admin API at ${getApiBaseUrl()}. Start WAMP (Apache) and confirm the api folder is available.`,
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        `Admin API not found at ${getApiBaseUrl()}/${endpoint}. Start WAMP and use npm start (not npm run serve) for local admin login.`,
      );
    }

    throw new Error(
      typeof data.error === 'string' ? data.error : 'Request failed',
    );
  }

  return data as T;
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    await request<{ok: boolean}>('health.php');
    return true;
  } catch {
    return false;
  }
}

export async function checkAuth(): Promise<boolean> {
  const data = await request<{authenticated: boolean}>('auth.php');
  return data.authenticated;
}

export async function login(password: string): Promise<void> {
  await request('auth.php', {
    method: 'POST',
    body: JSON.stringify({password}),
  });
}

export async function logout(): Promise<void> {
  await request('auth.php', {method: 'DELETE'});
}

export async function listChapters(): Promise<ChapterSummary[]> {
  const data = await request<{chapters: ChapterSummary[]}>('chapters.php');
  return data.chapters;
}

export async function getChapter(path: string): Promise<ChapterDetail> {
  const data = await request<{chapter: ChapterDetail}>(
    `chapters.php?path=${encodeURIComponent(path)}`,
  );
  return data.chapter;
}

export async function saveChapter(input: {
  path: string;
  title: string;
  body: string;
  sidebar_position?: string;
}): Promise<void> {
  await request('chapters.php', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

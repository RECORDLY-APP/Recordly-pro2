export function formatNaira(amount: number | string | null | undefined): string {
  const num = Number(amount || 0);
  return '₦' + num.toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

export function escapeHtml(str: string | null | undefined): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function toast(message: string, duration = 3000) {
  const container = document.getElementById('toastRoot');
  if (!container) return;
  const id = 'toast_' + Math.random().toString(36).slice(2, 8);
  const div = document.createElement('div');
  div.id = id;
  div.className =
    'animate-slide-up flex items-center gap-2 px-4 py-3 bg-slate-900 text-white text-xs sm:text-sm font-medium rounded-xl shadow-xl border border-slate-700/50 max-w-sm pointer-events-auto';
  div.innerHTML = `
    <svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
    </svg>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(div);
  setTimeout(() => {
    div.classList.add('opacity-0', 'transition-opacity', 'duration-300');
    setTimeout(() => div.remove(), 300);
  }, duration);
}

export function navigate(path: string) {
  if (path.startsWith('#')) {
    location.hash = path;
  } else {
    location.hash = '#/' + path.replace(/^\//, '');
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch (e) {
    console.error('Clipboard copy failed', e);
    return false;
  }
}

export function getShareUrl(subPath: string): string {
  const base = location.origin + location.pathname;
  const cleanSub = subPath.replace(/^#\/?/, '').replace(/^\//, '');
  return `${base}#/${cleanSub}`;
}

export function getLocalDateString(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type DebtStatusKind = 'paid' | 'overdue' | 'due-soon' | 'upcoming' | 'no-date';

export interface DebtStatusInfo {
  kind: DebtStatusKind;
  label: string;
  dueText: string;
  repaid: number;
  balance: number;
  percent: number;
}

export function getDebtStatusInfo(
  originalAmount: number,
  repayments: { amount: number }[],
  dueDate?: string | null
): DebtStatusInfo {
  const original = Math.max(0, Number(originalAmount || 0));
  const repaid = (repayments || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const balance = Math.max(0, original - repaid);
  const percent = original > 0 ? Math.min(100, Math.round((repaid / original) * 100)) : 0;

  if (balance === 0 && original > 0) {
    return {
      kind: 'paid',
      label: 'Paid off',
      dueText: dueDate ? `Due ${dueDate}` : 'Settled',
      repaid,
      balance,
      percent: 100,
    };
  }

  if (!dueDate) {
    return {
      kind: 'no-date',
      label: repaid > 0 ? 'Part paid' : 'Open',
      dueText: 'No due date',
      repaid,
      balance,
      percent,
    };
  }

  const todayStr = getLocalDateString(0);
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const [dy, dm, dd] = dueDate.split('-').map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const dueUtc = Date.UTC(dy, dm - 1, dd);
  const diffDays = Math.round((dueUtc - todayUtc) / 86400000);

  if (diffDays < 0) {
    const late = Math.abs(diffDays);
    return {
      kind: 'overdue',
      label: late === 1 ? 'Overdue · 1 day late' : `Overdue · ${late} days late`,
      dueText: `Due ${dueDate}`,
      repaid,
      balance,
      percent,
    };
  }

  if (diffDays === 0) {
    return {
      kind: 'due-soon',
      label: 'Due today',
      dueText: `Due ${dueDate}`,
      repaid,
      balance,
      percent,
    };
  }

  if (diffDays <= 3) {
    return {
      kind: 'due-soon',
      label: diffDays === 1 ? 'Due tomorrow' : `Due in ${diffDays} days`,
      dueText: `Due ${dueDate}`,
      repaid,
      balance,
      percent,
    };
  }

  return {
    kind: 'upcoming',
    label: `Due in ${diffDays} days`,
    dueText: `Due ${dueDate}`,
    repaid,
    balance,
    percent,
  };
}


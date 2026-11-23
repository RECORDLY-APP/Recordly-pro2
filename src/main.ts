import './style.css';
import { store } from './store';
import { DebtItem } from './types';
import {
  formatNaira,
  escapeHtml,
  toast,
  copyToClipboard,
  getShareUrl,
  navigate,
  getDebtStatusInfo,
  DebtStatusKind,
} from './utils';
import {
  openLogPaymentModal,
  openShareModal,
  openAddPersonModal,
  openAddDebtModal,
  openRepaymentModal,
} from './modals';
import { renderStepByStepGuideModal, resetWizard } from './guide';

const app = document.getElementById('app')!;
const modalRoot = document.getElementById('modalRoot')!;

type DebtFilter = 'all' | 'receivable' | 'payable' | 'overdue';
let debtFilter: DebtFilter = 'all';

// App Routing
function getHashPath(): string[] {
  return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
}

function render() {
  const parts = getHashPath();
  const route = parts[0] || '';

  // Render main content
  if (route === 'guide') {
    renderGuidePage();
  } else if (route === 'new') {
    renderNewRecordPage();
  } else if (route === 'debts') {
    renderDebtsPage();
  } else if (route === 'r' && parts[1] && parts[2]) {
    renderPersonAdminPage(parts[1], parts[2]);
  } else if (route === 'r' && parts[1]) {
    renderRecordDetailPage(parts[1]);
  } else if (route === 'p' && parts[1]) {
    renderPublicPersonPage(parts[1]);
  } else if (route === 'g' && parts[1]) {
    renderPublicGroupPage(parts[1]);
  } else {
    renderHomePage();
  }

  // Update bottom nav active state
  updateBottomNav(route);
}

// -------------------------------------------------------------
// 1. HOME PAGE (Fitted for Mobile Screen, 3 Big Action Buttons)
// -------------------------------------------------------------
function renderHomePage() {
  const stats = store.getOverallStats();
  const records = store.getRecords();

  app.innerHTML = `
    <div class="min-h-screen pb-24 animate-fade-in flex flex-col justify-start">
      
      <!-- Top Bar -->
      <header class="bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 py-3 shadow-xs">
        <div class="max-w-md mx-auto flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-sm shadow-xs">
              R
            </div>
            <div>
              <div class="font-extrabold text-slate-900 text-base leading-tight tracking-tight">Recordly</div>
              <div class="text-[11px] text-slate-500 font-medium">Simple records · Clear progress</div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button id="homeHelpBtn" class="p-2 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1" title="How it works guide">
              <svg class="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span class="hidden sm:inline">Guide</span>
            </button>
            <span class="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Ready
            </span>
          </div>
        </div>
      </header>

      <!-- Main Container: specifically crafted to fit into mobile screen heights -->
      <main class="max-w-md mx-auto w-full px-4 pt-3 space-y-3.5">
        
        <!-- Mobile Hero & Section: Fits cleanly into mobile viewports -->
        <section id="mobileActionHero" class="bg-gradient-to-b from-white to-slate-50/80 rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-sm">
          
          <!-- Compact Overview Stat Bar -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Money collected so far</span>
              <div class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                ${formatNaira(stats.totalCollected)}
              </div>
            </div>
            <div class="text-right text-xs">
              <span class="text-slate-500">${stats.recordCount} records</span>
              <span class="text-slate-300 mx-1">·</span>
              <span class="text-slate-500">${stats.peopleCount} people</span>
            </div>
          </div>

          <!-- Section Label with Plain Words & Short Hint -->
          <div class="pt-3 pb-2 flex items-center justify-between">
            <h2 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Quick Actions</h2>
            <span class="text-[11px] text-slate-500 font-medium">Tap any button to start</span>
          </div>

          <!-- THE 3 BIG BUTTONS: Styled for prominent mobile touch & clear hierarchy -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            
            <!-- Button 1: New record -->
            <button
              id="bigBtnNewRecord"
              class="group relative flex items-center sm:flex-col sm:items-start p-3 bg-white hover:bg-emerald-50/50 active:bg-emerald-100/40 border-2 border-emerald-600/30 hover:border-emerald-600 rounded-2xl text-left transition-all duration-150 shadow-xs active:scale-[0.98] min-h-[58px] sm:min-h-[110px]"
            >
              <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 mr-3 sm:mr-0 sm:mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
              </div>
              <div class="min-w-0 flex-1">
                <div class="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">New record</div>
                <div class="text-[11px] text-slate-500 mt-0.5 leading-snug">Start a new tracking list</div>
              </div>
              <div class="text-slate-400 group-hover:text-emerald-700 sm:hidden">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </div>
            </button>

            <!-- Button 2: Log payment -->
            <button
              id="bigBtnLogPayment"
              class="group relative flex items-center sm:flex-col sm:items-start p-3 bg-white hover:bg-blue-50/50 active:bg-blue-100/40 border-2 border-blue-600/30 hover:border-blue-600 rounded-2xl text-left transition-all duration-150 shadow-xs active:scale-[0.98] min-h-[58px] sm:min-h-[110px]"
            >
              <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0 mr-3 sm:mr-0 sm:mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <span class="text-base sm:text-lg font-black">₦</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">Log payment</div>
                <div class="text-[11px] text-slate-500 mt-0.5 leading-snug">Record money received</div>
              </div>
              <div class="text-slate-400 group-hover:text-blue-700 sm:hidden">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </div>
            </button>

            <!-- Button 3: Share link -->
            <button
              id="bigBtnShareLink"
              class="group relative flex items-center sm:flex-col sm:items-start p-3 bg-white hover:bg-amber-50/50 active:bg-amber-100/40 border-2 border-amber-600/30 hover:border-amber-600 rounded-2xl text-left transition-all duration-150 shadow-xs active:scale-[0.98] min-h-[58px] sm:min-h-[110px]"
            >
              <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 mr-3 sm:mr-0 sm:mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
              </div>
              <div class="min-w-0 flex-1">
                <div class="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">Share link</div>
                <div class="text-[11px] text-slate-500 mt-0.5 leading-snug">Send progress link</div>
              </div>
              <div class="text-slate-400 group-hover:text-amber-700 sm:hidden">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </div>
            </button>

          </div>

          <!-- Step-by-Step Guide Mini Banner -->
          <div class="mt-3 p-2.5 bg-emerald-50/80 border border-emerald-200/70 rounded-xl flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-6 h-6 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shrink-0">?</span>
              <div class="min-w-0">
                <div class="text-xs font-bold text-slate-900 truncate">Step-by-step guide</div>
                <div class="text-[11px] text-slate-600 truncate">Create your first record in 4 easy steps</div>
              </div>
            </div>
            <button id="bannerStartGuide" class="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors shadow-2xs">
              Start guide →
            </button>
          </div>

        </section>

        <!-- Records List Section -->
        <section class="space-y-2.5 pt-1">
          <div class="flex items-center justify-between px-1">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Your Records</h3>
              <p class="text-[11px] text-slate-500">Tap any record to see members or add payments</p>
            </div>
            <button onclick="location.hash='#/new'" class="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1">
              ＋ Add new
            </button>
          </div>

          ${
            records.length === 0
              ? `
                <div class="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-xs">
                  <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-2.5">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  </div>
                  <h4 class="text-sm font-bold text-slate-900 mb-1">No records yet</h4>
                  <p class="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
                    You have not created any records yet. Use our step-by-step guide to get set up in 60 seconds.
                  </p>
                  <button id="emptyStartGuideBtn" class="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors">
                    Start step-by-step guide
                  </button>
                </div>
              `
              : `
                <div class="space-y-2">
                  ${records
                    .map((r) => {
                      const totalPaid = r.people.reduce(
                        (a, p) =>
                          a + p.payments.reduce((b, pay) => b + Number(pay.amount || 0), 0),
                        0
                      );
                      const targetTotal = Number(r.target || 0) * r.people.length;
                      const percent = targetTotal
                        ? Math.min(100, Math.round((totalPaid / targetTotal) * 100))
                        : 0;

                      return `
                        <div
                          onclick="location.hash='#/r/${r.id}'"
                          class="group bg-white hover:bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3.5 shadow-xs cursor-pointer transition-all active:scale-[0.99]"
                        >
                          <div class="flex items-center justify-between gap-3 mb-2">
                            <div class="min-w-0 flex-1">
                              <h4 class="font-extrabold text-slate-900 text-sm truncate group-hover:text-emerald-800 transition-colors">
                                ${escapeHtml(r.title)}
                              </h4>
                              <div class="text-[11px] text-slate-500 mt-0.5">
                                ${r.people.length} ${r.people.length === 1 ? 'person' : 'people'} · ${formatNaira(totalPaid)} collected
                              </div>
                            </div>
                            <div class="text-right shrink-0">
                              <span class="text-xs font-bold text-slate-900">${formatNaira(totalPaid)}</span>
                              ${
                                r.target
                                  ? `<div class="text-[10px] text-slate-400">of ${formatNaira(targetTotal)}</div>`
                                  : ''
                              }
                            </div>
                          </div>

                          ${
                            r.target
                              ? `
                                <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex items-center">
                                  <div class="bg-emerald-600 h-full rounded-full transition-all duration-300" style="width: ${percent}%"></div>
                                </div>
                                <div class="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                                  <span>${percent}% collected</span>
                                  <span>Target: ${formatNaira(r.target)} each</span>
                                </div>
                              `
                              : ''
                          }
                        </div>
                      `;
                    })
                    .join('')}
                </div>
              `
          }
        </section>

        <!-- Debt Section (Receivables & Payables with Status & Due Date Tracking) -->
        ${renderDashboardDebtSection(true)}

      </main>

      <!-- Bottom Navigation for Effortless Mobile Thumb Reach -->
      ${renderBottomNav('home')}

    </div>
  `;

  // Bind actions
  document.getElementById('bigBtnNewRecord')?.addEventListener('click', () => {
    openNewRecordChooser();
  });

  document.getElementById('bigBtnLogPayment')?.addEventListener('click', () => {
    openLogPaymentModal();
  });

  document.getElementById('bigBtnShareLink')?.addEventListener('click', () => {
    openShareModal();
  });

  document.getElementById('bannerStartGuide')?.addEventListener('click', () => {
    resetWizard();
    renderStepByStepGuideModal(modalRoot, () => (modalRoot.innerHTML = ''));
  });

  document.getElementById('homeHelpBtn')?.addEventListener('click', () => {
    navigate('#/guide');
  });

  document.getElementById('emptyStartGuideBtn')?.addEventListener('click', () => {
    resetWizard();
    renderStepByStepGuideModal(modalRoot, () => (modalRoot.innerHTML = ''));
  });

  bindDebtSectionEvents();
}

// -------------------------------------------------------------
// Quick Chooser: Step-by-Step Guide or Fast Form
// -------------------------------------------------------------
function openNewRecordChooser() {
  modalRoot.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="bg-white w-full max-w-sm rounded-2xl shadow-xl p-5 border border-slate-100 animate-slide-up">
        
        <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div>
            <span class="text-xs font-semibold uppercase tracking-wider text-emerald-700">Create Record</span>
            <h3 class="text-base font-bold text-slate-900">How would you like to start?</h3>
          </div>
          <button id="closeChooserBtn" class="text-slate-400 hover:text-slate-600 p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <p class="text-xs text-slate-500 mb-4">
          Choose the step-by-step walkthrough if this is your first time, or quick setup for 1 screen.
        </p>

        <div class="space-y-2.5">
          <button id="chooserGuideBtn" class="w-full p-3.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl text-left flex items-start gap-3 transition-colors group">
            <div class="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 text-sm font-bold shadow-2xs">
              ✨
            </div>
            <div>
              <div class="text-sm font-bold text-slate-900 group-hover:text-emerald-900">Step-by-step guide (Recommended)</div>
              <div class="text-xs text-slate-600 mt-0.5">Walks you through naming, target amount, and adding people step by step.</div>
            </div>
          </button>

          <button id="chooserFastBtn" class="w-full p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left flex items-start gap-3 transition-colors group">
            <div class="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 text-sm font-bold shadow-2xs">
              ⚡
            </div>
            <div>
              <div class="text-sm font-bold text-slate-900 group-hover:text-slate-950">Quick 1-screen setup</div>
              <div class="text-xs text-slate-600 mt-0.5">Fill out all fields on a single form and save immediately.</div>
            </div>
          </button>
        </div>

      </div>
    </div>
  `;

  modalRoot.querySelector('#closeChooserBtn')?.addEventListener('click', () => (modalRoot.innerHTML = ''));

  modalRoot.querySelector('#chooserGuideBtn')?.addEventListener('click', () => {
    modalRoot.innerHTML = '';
    resetWizard();
    renderStepByStepGuideModal(modalRoot, () => (modalRoot.innerHTML = ''));
  });

  modalRoot.querySelector('#chooserFastBtn')?.addEventListener('click', () => {
    modalRoot.innerHTML = '';
    navigate('#/new');
  });
}

// -------------------------------------------------------------
// 2. NEW RECORD FORM (1-Page Fast Form with Plain Words & Hints)
// -------------------------------------------------------------
function renderNewRecordPage() {
  app.innerHTML = `
    <div class="min-h-screen pb-24 animate-fade-in flex flex-col justify-start">
      
      <header class="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-xs">
        <div class="max-w-md mx-auto flex items-center justify-between">
          <button onclick="location.hash='#/'" class="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            Back
          </button>
          <span class="text-sm font-bold text-slate-900">New Record</span>
          <button id="newFormGuideBtn" class="text-xs font-semibold text-emerald-800 hover:underline">
            Use guide
          </button>
        </div>
      </header>

      <main class="max-w-md mx-auto w-full px-4 pt-4 space-y-4">
        
        <div class="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div>
            <h1 class="text-lg font-extrabold text-slate-900">Create a new record</h1>
            <p class="text-xs text-slate-500 mt-0.5">Plain words and short hints on every field</p>
          </div>

          <!-- Title Field -->
          <div>
            <label for="formTitle" class="block text-xs font-bold text-slate-800 mb-1">
              Record name <span class="text-emerald-700">*</span>
            </label>
            <input
              id="formTitle"
              type="text"
              placeholder="e.g. Class Dues, Birthday Gift, Product Sales"
              class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent placeholder-slate-400"
              autofocus
            />
            <p class="text-[11px] text-slate-500 mt-1">Short hint: Give this collection a clear name everyone knows.</p>
          </div>

          <!-- Target Field -->
          <div>
            <label for="formTarget" class="block text-xs font-bold text-slate-800 mb-1">
              Target amount per person (optional)
            </label>
            <div class="relative">
              <span class="absolute left-3.5 top-2.5 text-slate-500 font-bold text-sm">₦</span>
              <input
                id="formTarget"
                type="number"
                inputmode="decimal"
                min="0"
                step="any"
                placeholder="e.g. 10000"
                class="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent placeholder-slate-400"
              />
            </div>
            <p class="text-[11px] text-slate-500 mt-1">Short hint: Expected amount per person. Leave empty if payments vary.</p>
          </div>

          <!-- End Date Field -->
          <div>
            <label for="formDate" class="block text-xs font-bold text-slate-800 mb-1">
              Due date (optional)
            </label>
            <input
              id="formDate"
              type="date"
              class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
            />
            <p class="text-[11px] text-slate-500 mt-1">Short hint: When all payments should be finished.</p>
          </div>

          <!-- People Field -->
          <div>
            <label for="formPeople" class="block text-xs font-bold text-slate-800 mb-1">
              People on this list (optional)
            </label>
            <textarea
              id="formPeople"
              rows="4"
              placeholder="Amina Bello, 08012345678&#10;David Okafor&#10;Tunde Smith"
              class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent placeholder-slate-400"
            ></textarea>
            <p class="text-[11px] text-slate-500 mt-1">Short hint: One person per line. Format: Name, Phone (optional). You can add more later.</p>
          </div>

          <!-- Submit Buttons -->
          <div class="pt-2 flex items-center justify-end gap-2.5">
            <button onclick="location.hash='#/'" class="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-100 transition-colors">
              Cancel
            </button>
            <button id="saveNewRecordBtn" class="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors shadow-xs">
              Save record ✓
            </button>
          </div>

        </div>

      </main>

      ${renderBottomNav('new')}

    </div>
  `;

  document.getElementById('newFormGuideBtn')?.addEventListener('click', () => {
    resetWizard();
    renderStepByStepGuideModal(modalRoot, () => (modalRoot.innerHTML = ''));
  });

  document.getElementById('saveNewRecordBtn')?.addEventListener('click', () => {
    const title = (document.getElementById('formTitle') as HTMLInputElement)?.value.trim();
    if (!title) {
      toast('Please enter a record name.');
      (document.getElementById('formTitle') as HTMLInputElement)?.focus();
      return;
    }

    const targetVal = (document.getElementById('formTarget') as HTMLInputElement)?.value;
    const dateVal = (document.getElementById('formDate') as HTMLInputElement)?.value;
    const peopleVal = (document.getElementById('formPeople') as HTMLTextAreaElement)?.value || '';

    const lines = peopleVal
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const initialPeople = lines.map((l) => {
      const parts = l.split(',');
      return {
        name: parts[0].trim(),
        phone: parts[1] ? parts[1].trim() : null,
      };
    });

    const newRec = store.createRecord(
      title,
      targetVal ? Number(targetVal) : null,
      dateVal || null,
      initialPeople
    );

    toast('Record created successfully!');
    navigate('#/r/' + newRec.id);
  });
}

// -------------------------------------------------------------
// 3. STEP-BY-STEP GUIDE PAGE (Visual Walkthrough & Reference)
// -------------------------------------------------------------
function renderGuidePage() {
  app.innerHTML = `
    <div class="min-h-screen pb-24 animate-fade-in flex flex-col justify-start">
      
      <header class="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-xs">
        <div class="max-w-md mx-auto flex items-center justify-between">
          <button onclick="location.hash='#/'" class="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            Home
          </button>
          <span class="text-sm font-bold text-slate-900">Guide & Tips</span>
          <div class="w-10"></div>
        </div>
      </header>

      <main class="max-w-md mx-auto w-full px-4 pt-4 space-y-4">
        
        <div class="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <span class="text-xs font-semibold text-emerald-700 uppercase tracking-wider block mb-1">Beginner Guide</span>
          <h1 class="text-lg font-black text-slate-900">How to use Recordly</h1>
          <p class="text-xs text-slate-500 mt-1 leading-relaxed">
            Recordly helps you keep track of group collections, dues, and payments without messy notebooks or spreadsheets.
          </p>

          <button id="guidePageStartBtn" class="mt-4 w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-2">
            <span>✨ Start the interactive 4-step wizard</span>
          </button>
        </div>

        <!-- 3 Pillars Explained with Plain Words -->
        <div class="space-y-3">
          
          <!-- Step 1 -->
          <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex gap-3.5 items-start">
            <div class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <h2 class="text-sm font-bold text-slate-900">Create a record</h2>
              <p class="text-xs text-slate-600 mt-1 leading-relaxed">
                Give your record a name (e.g. "December Dues"). Set a target amount if there is one, and write down the names of people contributing.
              </p>
              <div class="mt-2 text-[11px] text-emerald-800 font-medium bg-emerald-50 px-2 py-1 rounded-md inline-block">
                Short hint: You can always add more people later.
              </div>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex gap-3.5 items-start">
            <div class="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-black text-sm flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <h2 class="text-sm font-bold text-slate-900">Log payments as they arrive</h2>
              <p class="text-xs text-slate-600 mt-1 leading-relaxed">
                When someone gives you cash or makes a bank transfer, tap <strong>Log payment</strong>, enter the amount, and tap save. Recordly does the math.
              </p>
              <div class="mt-2 text-[11px] text-blue-800 font-medium bg-blue-50 px-2 py-1 rounded-md inline-block">
                Short hint: You can add an optional note like "Bank transfer".
              </div>
            </div>
          </div>

          <!-- Step 3 -->
          <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex gap-3.5 items-start">
            <div class="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-black text-sm flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <h2 class="text-sm font-bold text-slate-900">Share progress links</h2>
              <p class="text-xs text-slate-600 mt-1 leading-relaxed">
                Tap <strong>Share link</strong> to send each person their private progress link or share the group link in your WhatsApp group.
              </p>
              <div class="mt-2 text-[11px] text-amber-900 font-medium bg-amber-50 px-2 py-1 rounded-md inline-block">
                Short hint: People don't need to log in or install anything to view their balance.
              </div>
            </div>
          </div>

        </div>

      </main>

      ${renderBottomNav('guide')}

    </div>
  `;

  document.getElementById('guidePageStartBtn')?.addEventListener('click', () => {
    resetWizard();
    renderStepByStepGuideModal(modalRoot, () => (modalRoot.innerHTML = ''));
  });
}

// -------------------------------------------------------------
// 4. RECORD DETAIL PAGE (Organized with Plain Words & Hints)
// -------------------------------------------------------------
function renderRecordDetailPage(recordId: string) {
  const record = store.getRecord(recordId);
  if (!record) {
    app.innerHTML = `
      <div class="min-h-screen p-4 flex items-center justify-center text-center">
        <div class="bg-white p-6 rounded-2xl border border-slate-200 max-w-sm">
          <h2 class="text-base font-bold text-slate-900 mb-1">Record not found</h2>
          <p class="text-xs text-slate-500 mb-4">This record may have been deleted or the link is incorrect.</p>
          <button onclick="location.hash='#/'" class="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold">
            Return home
          </button>
        </div>
      </div>
    `;
    return;
  }

  const people = record.people || [];
  const totalCollected = people.reduce(
    (a, p) => a + p.payments.reduce((b, pay) => b + Number(pay.amount || 0), 0),
    0
  );
  const targetTotal = Number(record.target || 0) * people.length;
  const percent = targetTotal ? Math.min(100, Math.round((totalCollected / targetTotal) * 100)) : 0;

  app.innerHTML = `
    <div class="min-h-screen pb-24 animate-fade-in flex flex-col justify-start">
      
      <header class="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-xs">
        <div class="max-w-md mx-auto flex items-center justify-between">
          <button onclick="location.hash='#/'" class="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            Workspace
          </button>
          <span class="text-xs font-bold text-slate-900 truncate max-w-[160px]">${escapeHtml(record.title)}</span>
          <button id="recordShareBtn" class="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
            Share
          </button>
        </div>
      </header>

      <main class="max-w-md mx-auto w-full px-4 pt-4 space-y-3.5">
        
        <!-- Summary Card -->
        <div class="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-lg font-black text-slate-900 leading-tight">${escapeHtml(record.title)}</h1>
              <p class="text-xs text-slate-500 mt-0.5">
                ${people.length} ${people.length === 1 ? 'person' : 'people'}
                ${record.end_date ? '· Due ' + record.end_date : ''}
              </p>
            </div>
            <button id="deleteRecordBtn" class="text-xs text-red-600 hover:text-red-800 p-1" title="Delete record">
              Delete
            </button>
          </div>

          <div class="grid grid-cols-2 gap-2 pt-1">
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">Collected</span>
              <strong class="text-base font-black text-slate-900">${formatNaira(totalCollected)}</strong>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">Target per person</span>
              <strong class="text-base font-black text-slate-900">${record.target ? formatNaira(record.target) : 'None'}</strong>
            </div>
          </div>

          ${
            record.target
              ? `
                <div class="pt-1">
                  <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div class="bg-emerald-600 h-full rounded-full transition-all duration-300" style="width: ${percent}%"></div>
                  </div>
                  <div class="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                    <span>${percent}% of total expected (${formatNaira(targetTotal)})</span>
                    <span>Remaining: ${formatNaira(Math.max(0, targetTotal - totalCollected))}</span>
                  </div>
                </div>
              `
              : ''
          }

          <!-- Quick Action Buttons for This Record -->
          <div class="pt-2 flex gap-2">
            <button id="recordLogPayBtn" class="flex-1 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1.5">
              <span>₦ Log payment</span>
            </button>
            <button id="recordAddPersonBtn" class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
              <span>＋ Add person</span>
            </button>
          </div>
        </div>

        <!-- Hint banner -->
        <div class="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-[11px] text-emerald-950 flex items-center gap-2">
          <span>💡</span>
          <span>Short hint: Tap any person below to record their payments or get their private link.</span>
        </div>

        <!-- People List -->
        <div class="space-y-2">
          <div class="flex items-center justify-between px-1">
            <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">
              People on this record (${people.length})
            </h3>
          </div>

          ${
            people.length === 0
              ? `
                <div class="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
                  <p class="mb-3">No one has been added to this record yet.</p>
                  <button id="emptyAddPersonBtn" class="px-4 py-2 bg-emerald-700 text-white rounded-xl font-semibold">
                    Add first person
                  </button>
                </div>
              `
              : `
                <div class="space-y-2">
                  ${people
                    .map((p) => {
                      const paid = p.payments.reduce((a, b) => a + Number(b.amount || 0), 0);
                      const target = Number(record.target || 0);
                      const pPercent = target ? Math.min(100, Math.round((paid / target) * 100)) : 0;
                      const isComplete = target > 0 && paid >= target;

                      return `
                        <div
                          onclick="location.hash='#/r/${record.id}/${p.id}'"
                          class="group bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 shadow-xs cursor-pointer transition-all active:scale-[0.99] flex items-center justify-between gap-3"
                        >
                          <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 font-extrabold text-sm flex items-center justify-center shrink-0">
                            ${escapeHtml(p.name.slice(0, 1).toUpperCase())}
                          </div>

                          <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2">
                              <span class="font-extrabold text-slate-900 text-sm truncate group-hover:text-emerald-800">
                                ${escapeHtml(p.name)}
                              </span>
                              ${
                                isComplete
                                  ? `<span class="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Paid in full ✓</span>`
                                  : ''
                              }
                            </div>
                            <div class="text-[11px] text-slate-500 mt-0.5">
                              ${formatNaira(paid)} paid ${target ? '· ' + formatNaira(Math.max(0, target - paid)) + ' remaining' : ''}
                            </div>
                            ${
                              target > 0
                                ? `
                                  <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                                    <div class="bg-emerald-600 h-full rounded-full" style="width: ${pPercent}%"></div>
                                  </div>
                                `
                                : ''
                            }
                          </div>

                          <div class="text-slate-400 group-hover:text-slate-700 shrink-0">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                          </div>
                        </div>
                      `;
                    })
                    .join('')}
                </div>
              `
          }
        </div>

      </main>

      ${renderBottomNav('records')}

    </div>
  `;

  // Bind
  document.getElementById('recordShareBtn')?.addEventListener('click', () => {
    openShareModal(record.id);
  });

  document.getElementById('recordLogPayBtn')?.addEventListener('click', () => {
    openLogPaymentModal(record.id);
  });

  document.getElementById('recordAddPersonBtn')?.addEventListener('click', () => {
    openAddPersonModal(record.id, () => {
      render();
    });
  });

  document.getElementById('emptyAddPersonBtn')?.addEventListener('click', () => {
    openAddPersonModal(record.id, () => {
      render();
    });
  });

  document.getElementById('deleteRecordBtn')?.addEventListener('click', () => {
    if (confirm(`Are you sure you want to delete "${record.title}"? This cannot be undone.`)) {
      store.deleteRecord(record.id);
      toast('Record deleted.');
      navigate('#/');
    }
  });
}

// -------------------------------------------------------------
// 5. PERSON ADMIN PAGE (Record Owner view of 1 Person)
// -------------------------------------------------------------
function renderPersonAdminPage(recordId: string, personId: string) {
  const found = store.getPerson(personId);
  if (!found) {
    navigate('#/r/' + recordId);
    return;
  }

  const { person, record } = found;
  const totalPaid = person.payments.reduce((a, b) => a + Number(b.amount || 0), 0);
  const target = Number(record.target || 0);
  const remaining = target > totalPaid ? target - totalPaid : 0;
  const personalShareUrl = getShareUrl('p/' + person.id);

  app.innerHTML = `
    <div class="min-h-screen pb-24 animate-fade-in flex flex-col justify-start">
      
      <header class="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-xs">
        <div class="max-w-md mx-auto flex items-center justify-between">
          <button onclick="location.hash='#/r/${record.id}'" class="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            ${escapeHtml(record.title)}
          </button>
          <span class="text-xs font-bold text-slate-900 truncate max-w-[150px]">${escapeHtml(person.name)}</span>
          <button id="deletePersonBtn" class="text-xs text-red-600 hover:text-red-800">
            Remove
          </button>
        </div>
      </header>

      <main class="max-w-md mx-auto w-full px-4 pt-4 space-y-4">
        
        <!-- Person Header Card -->
        <div class="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-900 font-black text-lg flex items-center justify-center shrink-0">
              ${escapeHtml(person.name.slice(0, 1).toUpperCase())}
            </div>
            <div class="min-w-0 flex-1">
              <h1 class="text-base font-extrabold text-slate-900 truncate">${escapeHtml(person.name)}</h1>
              <p class="text-xs text-slate-500">${escapeHtml(person.phone || 'No phone number saved')}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 pt-1">
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">Total paid</span>
              <strong class="text-base font-black text-emerald-700">${formatNaira(totalPaid)}</strong>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">Remaining</span>
              <strong class="text-base font-black text-slate-900">${target ? formatNaira(remaining) : 'No target'}</strong>
            </div>
          </div>

          <!-- Private Progress Link Box -->
          <div class="pt-2 border-t border-slate-100 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-700">Personal progress link</span>
              <span class="text-[11px] text-slate-500">Private to ${escapeHtml(person.name)}</span>
            </div>
            <div class="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs text-slate-600 break-all select-all">
              ${personalShareUrl}
            </div>
            <div class="flex gap-2">
              <button id="copyPersonalBtn" class="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                Copy link
              </button>
              <a
                href="https://wa.me/${person.phone ? person.phone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent('Hi ' + person.name + '! Here is your payment progress link for ' + record.title + ': ' + personalShareUrl)}"
                target="_blank"
                rel="noopener"
                class="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                Send via WhatsApp
              </a>
            </div>
            <p class="text-[11px] text-slate-500">Short hint: They can tap this link anytime to check what they have paid.</p>
          </div>
        </div>

        <!-- Log Payment Quick Form -->
        <div class="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold text-slate-900">Record a payment for ${escapeHtml(person.name)}</h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <label for="personPayAmount" class="block text-xs font-bold text-slate-700 mb-1">
                Amount paid (₦) <span class="text-emerald-700">*</span>
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-2.5 text-slate-500 font-bold text-sm">₦</span>
                <input
                  id="personPayAmount"
                  type="number"
                  inputmode="decimal"
                  min="1"
                  step="any"
                  placeholder="e.g. 5000"
                  class="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 font-semibold"
                  value="${remaining > 0 ? remaining : ''}"
                />
              </div>
              <p class="text-[11px] text-slate-500 mt-1">Short hint: Enter the amount received.</p>
            </div>

            <div>
              <label for="personPayDate" class="block text-xs font-bold text-slate-700 mb-1">
                Payment date
              </label>
              <input
                id="personPayDate"
                type="date"
                class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                value="${new Date().toISOString().slice(0, 10)}"
              />
              <p class="text-[11px] text-slate-500 mt-1">Short hint: When the money arrived.</p>
            </div>
          </div>

          <div>
            <label for="personPayNote" class="block text-xs font-bold text-slate-700 mb-1">
              Payment note (optional)
            </label>
            <input
              id="personPayNote"
              type="text"
              placeholder="e.g. Bank transfer, Cash, Opay, First installment"
              class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 placeholder-slate-400"
            />
            <p class="text-[11px] text-slate-500 mt-1">Short hint: Visible to you and on their receipt.</p>
          </div>

          <button id="savePersonPayBtn" class="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5">
            Save payment ✓
          </button>
        </div>

        <!-- Payment History -->
        <div class="space-y-2">
          <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider px-1">
            Payment History (${person.payments.length})
          </h3>

          ${
            person.payments.length === 0
              ? `
                <div class="bg-white border border-slate-200 rounded-2xl p-5 text-center text-xs text-slate-500">
                  No payments logged for this person yet.
                </div>
              `
              : `
                <div class="divide-y divide-slate-100 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  ${person.payments
                    .map(
                      (pay) => `
                        <div class="p-3.5 flex items-center justify-between gap-3">
                          <div>
                            <div class="text-xs font-extrabold text-slate-900">${formatNaira(pay.amount)}</div>
                            <div class="text-[11px] text-slate-500 mt-0.5">
                              ${pay.paid_on} ${pay.note ? '· ' + escapeHtml(pay.note) : ''}
                            </div>
                          </div>
                          <button class="delete-pay-btn text-xs text-slate-400 hover:text-red-600 p-1" data-id="${pay.id}" title="Remove payment">
                            ✕
                          </button>
                        </div>
                      `
                    )
                    .join('')}
                </div>
              `
          }
        </div>

      </main>

      ${renderBottomNav('records')}

    </div>
  `;

  // Bind
  document.getElementById('copyPersonalBtn')?.addEventListener('click', async () => {
    const ok = await copyToClipboard(personalShareUrl);
    if (ok) toast('Personal progress link copied!');
  });

  document.getElementById('savePersonPayBtn')?.addEventListener('click', () => {
    const amountEl = document.getElementById('personPayAmount') as HTMLInputElement;
    const amountVal = Number(amountEl?.value || 0);
    if (!amountVal || amountVal <= 0) {
      toast('Please enter a valid payment amount.');
      amountEl?.focus();
      return;
    }
    const dateEl = document.getElementById('personPayDate') as HTMLInputElement;
    const noteEl = document.getElementById('personPayNote') as HTMLInputElement;

    store.addPayment(
      person.id,
      amountVal,
      dateEl?.value || new Date().toISOString().slice(0, 10),
      noteEl?.value || null
    );

    toast(`Payment of ${formatNaira(amountVal)} logged!`);
    render();
  });

  document.querySelectorAll('.delete-pay-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const payId = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (payId && confirm('Remove this payment entry?')) {
        store.deletePayment(payId);
        toast('Payment removed.');
        render();
      }
    });
  });

  document.getElementById('deletePersonBtn')?.addEventListener('click', () => {
    if (confirm(`Remove ${person.name} from this record?`)) {
      store.deletePerson(person.id);
      toast('Person removed from record.');
      navigate('#/r/' + record.id);
    }
  });
}

// -------------------------------------------------------------
// 6. PUBLIC PERSONAL PROGRESS PAGE (What members see!)
// -------------------------------------------------------------
function renderPublicPersonPage(personId: string) {
  const found = store.getPerson(personId);
  if (!found) {
    app.innerHTML = `
      <div class="min-h-screen p-4 flex items-center justify-center text-center">
        <div class="bg-white p-6 rounded-2xl border border-slate-200 max-w-sm">
          <h2 class="text-base font-bold text-slate-900 mb-1">Progress link not found</h2>
          <p class="text-xs text-slate-500 mb-4">Please ask the organizer for an updated link.</p>
          <button onclick="location.hash='#/'" class="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold">
            Open Recordly
          </button>
        </div>
      </div>
    `;
    return;
  }

  const { person, record } = found;
  const totalPaid = person.payments.reduce((a, b) => a + Number(b.amount || 0), 0);
  const target = Number(record.target || 0);
  const remaining = target > totalPaid ? target - totalPaid : 0;
  const percent = target ? Math.min(100, Math.round((totalPaid / target) * 100)) : 0;
  const isComplete = target > 0 && totalPaid >= target;

  app.innerHTML = `
    <div class="min-h-screen pb-12 animate-fade-in flex flex-col justify-start bg-slate-50">
      
      <!-- Public Top Bar -->
      <header class="bg-white border-b border-slate-200 px-4 py-3 shadow-xs">
        <div class="max-w-md mx-auto flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
              R
            </div>
            <span class="font-extrabold text-slate-900 text-sm">Recordly</span>
          </div>
          <span class="text-[11px] font-semibold text-slate-500">Personal Progress</span>
        </div>
      </header>

      <main class="max-w-md mx-auto w-full px-4 pt-4 space-y-4">
        
        <!-- Big Progress Card -->
        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 text-center">
          
          <div class="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-xl flex items-center justify-center mx-auto">
            ${escapeHtml(person.name.slice(0, 1).toUpperCase())}
          </div>

          <div>
            <h1 class="text-lg font-black text-slate-900">${escapeHtml(person.name)}</h1>
            <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(record.title)}</p>
          </div>

          <!-- Total Paid Big Number -->
          <div class="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100">
            <span class="text-xs font-semibold text-emerald-900 uppercase tracking-wide block">Your total payment</span>
            <div class="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight mt-1">
              ${formatNaira(totalPaid)}
            </div>
            ${
              target > 0
                ? `
                  <div class="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mt-3">
                    <div class="bg-emerald-600 h-full rounded-full transition-all duration-300" style="width: ${percent}%"></div>
                  </div>
                  <div class="flex justify-between items-center text-xs text-slate-600 mt-2 font-medium">
                    <span>${percent}% completed</span>
                    <span>${isComplete ? 'Paid in full! 🎉' : formatNaira(remaining) + ' remaining'}</span>
                  </div>
                `
                : `<p class="text-xs text-slate-500 mt-1">No fixed target set</p>`
            }
          </div>

          <p class="text-[11px] text-slate-500">
            Short hint: This record is kept up to date by the organizer whenever a payment is confirmed.
          </p>

          ${
            record.group_link
              ? `
                <a href="#/g/${record.id}" class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:underline pt-1">
                  <span>View full group directory & table →</span>
                </a>
              `
              : ''
          }
        </div>

        <!-- Payments Statement -->
        <div class="space-y-2">
          <h2 class="text-xs font-bold text-slate-800 uppercase tracking-wider px-1">
            Payment Statement (${person.payments.length})
          </h2>

          ${
            person.payments.length === 0
              ? `
                <div class="bg-white border border-slate-200 rounded-2xl p-5 text-center text-xs text-slate-500">
                  No payments have been recorded for your account yet.
                </div>
              `
              : `
                <div class="divide-y divide-slate-100 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  ${person.payments
                    .map(
                      (pay) => `
                        <div class="p-3.5 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <div class="font-extrabold text-slate-900">${formatNaira(pay.amount)}</div>
                            <div class="text-[11px] text-slate-500 mt-0.5">${pay.paid_on}</div>
                          </div>
                          ${
                            pay.note
                              ? `<span class="text-[11px] text-slate-600 bg-slate-100 px-2 py-1 rounded-md max-w-[140px] truncate">${escapeHtml(pay.note)}</span>`
                              : ''
                          }
                        </div>
                      `
                    )
                    .join('')}
                </div>
              `
          }
        </div>

        <div class="text-center text-[11px] text-slate-400 pt-4">
          Recordly · Simple records, clear progress
        </div>

      </main>

    </div>
  `;
}

// -------------------------------------------------------------
// 7. PUBLIC GROUP VIEW (Directory of Members & Group Table)
// -------------------------------------------------------------
function renderPublicGroupPage(recordId: string) {
  const record = store.getRecord(recordId);
  if (!record) {
    navigate('#/');
    return;
  }

  const people = record.people || [];
  const totalCollected = people.reduce(
    (a, p) => a + p.payments.reduce((b, pay) => b + Number(pay.amount || 0), 0),
    0
  );

  app.innerHTML = `
    <div class="min-h-screen pb-16 animate-fade-in flex flex-col justify-start bg-slate-50">
      
      <header class="bg-white border-b border-slate-200 px-4 py-3 shadow-xs">
        <div class="max-w-md mx-auto flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
              R
            </div>
            <span class="font-extrabold text-slate-900 text-sm">Recordly</span>
          </div>
          <span class="text-[11px] font-semibold text-slate-500">Group Page</span>
        </div>
      </header>

      <main class="max-w-md mx-auto w-full px-4 pt-4 space-y-4">
        
        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <h1 class="text-base font-extrabold text-slate-900">${escapeHtml(record.title)}</h1>
          <p class="text-xs text-slate-500 mt-0.5">
            ${people.length} people · ${formatNaira(totalCollected)} collected so far
          </p>

          <div class="mt-3 p-2.5 bg-emerald-50 rounded-xl text-xs text-emerald-950 flex items-center gap-2">
            <span>👉</span>
            <span>Tap your name below to view your personal payments statement.</span>
          </div>
        </div>

        <!-- Members Directory -->
        <div class="space-y-2">
          <h2 class="text-xs font-bold text-slate-800 uppercase tracking-wider px-1">
            Choose your name (${people.length})
          </h2>

          <div class="space-y-2">
            ${people
              .map((p) => {
                const paid = p.payments.reduce((a, b) => a + Number(b.amount || 0), 0);
                return `
                  <a
                    href="#/p/${p.id}"
                    class="block bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-xs transition-colors"
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                          ${escapeHtml(p.name.slice(0, 1).toUpperCase())}
                        </div>
                        <span class="font-bold text-slate-900 text-xs truncate">${escapeHtml(p.name)}</span>
                      </div>
                      <div class="text-right">
                        <span class="text-xs font-bold text-emerald-800">${formatNaira(paid)}</span>
                      </div>
                    </div>
                  </a>
                `;
              })
              .join('')}
          </div>
        </div>

        <div class="text-center text-[11px] text-slate-400 pt-4">
          Recordly · Simple records, clear progress
        </div>

      </main>

    </div>
  `;
}

// -------------------------------------------------------------
// Debt Section Helpers & Dedicated Debts View (#/debts)
// -------------------------------------------------------------
function getDebtStatusPresentation(kind: DebtStatusKind): {
  textClass: string;
  iconSvg: string;
} {
  if (kind === 'paid') {
    return {
      textClass: 'text-emerald-700',
      iconSvg:
        '<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M5 13l4 4L19 7"/></svg>',
    };
  }
  if (kind === 'overdue') {
    return {
      textClass: 'text-rose-700',
      iconSvg:
        '<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>',
    };
  }
  if (kind === 'due-soon') {
    return {
      textClass: 'text-amber-700',
      iconSvg:
        '<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    };
  }
  return {
    textClass: 'text-slate-600',
    iconSvg:
      '<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>',
  };
}

function filterDebtsList(debts: DebtItem[]): DebtItem[] {
  const filtered = debts.filter((d) => {
    const info = getDebtStatusInfo(d.original_amount, d.repayments, d.due_date);
    if (debtFilter === 'receivable') return d.type === 'receivable';
    if (debtFilter === 'payable') return d.type === 'payable';
    if (debtFilter === 'overdue') return info.kind === 'overdue';
    return true;
  });

  // Sort: overdue first, then due-soon, then open/upcoming by due_date, settled last
  const rank: Record<DebtStatusKind, number> = {
    overdue: 0,
    'due-soon': 1,
    upcoming: 2,
    'no-date': 3,
    paid: 4,
  };

  return filtered.sort((a, b) => {
    const ia = getDebtStatusInfo(a.original_amount, a.repayments, a.due_date);
    const ib = getDebtStatusInfo(b.original_amount, b.repayments, b.due_date);
    if (rank[ia.kind] !== rank[ib.kind]) return rank[ia.kind] - rank[ib.kind];
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return b.created_at.localeCompare(a.created_at);
  });
}

function renderDebtRowHtml(d: DebtItem): string {
  const info = getDebtStatusInfo(d.original_amount, d.repayments, d.due_date);
  const statusUi = getDebtStatusPresentation(info.kind);
  const isReceivable = d.type === 'receivable';
  const directionLabel = isReceivable ? 'Owed to you (Receivable)' : 'You owe (Payable)';
  const directionColor = isReceivable ? 'text-emerald-800' : 'text-rose-700';

  return `
    <div class="p-3.5 space-y-2.5 bg-white">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 text-[11px] font-semibold ${directionColor}">
            <span>${directionLabel}</span>
          </div>
          <h4 class="font-extrabold text-slate-900 text-sm truncate mt-0.5">${escapeHtml(d.person_name)}</h4>
          ${
            d.notes
              ? `<p class="text-[11px] text-slate-500 truncate mt-0.5">${escapeHtml(d.notes)}</p>`
              : ''
          }
        </div>

        <div class="text-right shrink-0 tabular-nums">
          <div class="text-sm font-black ${info.kind === 'paid' ? 'text-slate-500 line-through' : isReceivable ? 'text-emerald-800' : 'text-rose-700'}">
            ${formatNaira(info.balance)}
          </div>
          <div class="text-[10px] text-slate-500">
            ${info.repaid > 0 ? `${formatNaira(info.repaid)} paid of ${formatNaira(d.original_amount)}` : `Original ${formatNaira(d.original_amount)}`}
          </div>
        </div>
      </div>

      ${
        info.repaid > 0
          ? `
            <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div class="${isReceivable ? 'bg-emerald-600' : 'bg-rose-600'} h-full rounded-full transition-all duration-300" style="width: ${info.percent}%"></div>
            </div>
          `
          : ''
      }

      <div class="flex items-center justify-between gap-2 pt-0.5">
        <div class="flex items-center gap-1.5 text-[11px] font-semibold ${statusUi.textClass} min-w-0">
          ${statusUi.iconSvg}
          <span class="truncate">${escapeHtml(info.label)}</span>
          <span class="text-slate-300" aria-hidden="true">·</span>
          <span class="text-slate-500 font-medium whitespace-nowrap">${escapeHtml(info.dueText)}</span>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          ${
            info.balance > 0
              ? `<button data-repay-debt="${d.id}" class="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap">
                  Log repayment
                </button>`
              : `<button data-repay-debt="${d.id}" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap">
                  History
                </button>`
          }
          <button data-delete-debt="${d.id}" aria-label="Delete ${escapeHtml(d.person_name)}" class="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderDashboardDebtSection(compact = false): string {
  const debts = store.getDebts();
  const stats = store.getDebtStats();
  const sorted = filterDebtsList(debts);
  const visible = compact ? sorted.slice(0, 5) : sorted;

  return `
    <section id="dashboardDebtSection" class="space-y-2.5 pt-2">
      <div class="flex items-center justify-between px-1">
        <div>
          <h3 class="text-sm font-bold text-slate-900">Debt</h3>
          <p class="text-[11px] text-slate-500">Money owed to you (receivables) and money you owe (payables)</p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          ${
            compact && debts.length > 0
              ? `<button onclick="location.hash='#/debts'" class="text-xs font-semibold text-slate-600 hover:text-slate-900 whitespace-nowrap">
                  See all (${debts.length})
                </button>`
              : ''
          }
          <button id="dashAddDebtBtn" class="text-xs font-bold text-emerald-800 hover:text-emerald-950 whitespace-nowrap">
            ＋ Add debt
          </button>
        </div>
      </div>

      <div class="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <!-- Debt Summary Strip -->
        <div class="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/60">
          <div class="p-3">
            <div class="text-[11px] font-medium text-slate-500">Owed to you</div>
            <div class="text-sm font-extrabold text-emerald-800 tabular-nums mt-0.5 truncate">${formatNaira(stats.owedToMe)}</div>
          </div>
          <div class="p-3">
            <div class="text-[11px] font-medium text-slate-500">You owe</div>
            <div class="text-sm font-extrabold text-rose-700 tabular-nums mt-0.5 truncate">${formatNaira(stats.iOwe)}</div>
          </div>
          <div class="p-3">
            <div class="text-[11px] font-medium text-slate-500">Overdue</div>
            <div class="text-sm font-extrabold ${stats.overdueCount > 0 ? 'text-rose-700' : 'text-slate-800'} tabular-nums mt-0.5">
              ${stats.overdueCount} ${stats.overdueCount === 1 ? 'item' : 'items'}
            </div>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="p-2 border-b border-slate-100 bg-white">
          <div class="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl">
            <button data-debt-filter="all" class="py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${debtFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}">
              All (${debts.length})
            </button>
            <button data-debt-filter="receivable" class="py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${debtFilter === 'receivable' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}">
              Owed to me
            </button>
            <button data-debt-filter="payable" class="py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${debtFilter === 'payable' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}">
              I owe
            </button>
            <button data-debt-filter="overdue" class="py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${debtFilter === 'overdue' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}">
              Overdue (${stats.overdueCount})
            </button>
          </div>
        </div>

        <!-- Debt List -->
        ${
          visible.length === 0
            ? `
              <div class="p-6 text-center">
                <p class="text-xs font-bold text-slate-800">
                  ${debts.length === 0 ? 'No debts recorded yet' : 'No debts match this filter'}
                </p>
                <p class="text-[11px] text-slate-500 mt-1 mb-3 max-w-xs mx-auto">
                  ${
                    debts.length === 0
                      ? 'Add money people owe you or money you owe others to track due dates.'
                      : 'Switch filter above or add a new receivable or payable.'
                  }
                </p>
                <button id="dashEmptyDebtBtn" class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-colors">
                  Add a debt
                </button>
              </div>
            `
            : `
              <div class="divide-y divide-slate-100">
                ${visible.map((d) => renderDebtRowHtml(d)).join('')}
              </div>
            `
        }
      </div>
    </section>
  `;
}

function openDeleteDebtConfirmModal(debtId: string) {
  const debt = store.getDebt(debtId);
  if (!debt) return;

  modalRoot.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="bg-white w-full max-w-sm rounded-2xl shadow-xl p-5 border border-slate-100 animate-slide-up">
        <h3 class="text-base font-bold text-slate-900">Delete debt record?</h3>
        <p class="text-xs text-slate-600 mt-1.5 leading-relaxed">
          This removes the debt with <strong>${escapeHtml(debt.person_name)}</strong> (${formatNaira(debt.original_amount)}) and its repayment history.
        </p>
        <div class="flex items-center justify-end gap-2 mt-4">
          <button id="cancelDelDebtBtn" class="px-4 py-2 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button id="confirmDelDebtBtn" class="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  `;

  modalRoot.querySelector('#cancelDelDebtBtn')?.addEventListener('click', () => (modalRoot.innerHTML = ''));
  modalRoot.querySelector('#confirmDelDebtBtn')?.addEventListener('click', () => {
    store.deleteDebt(debtId);
    modalRoot.innerHTML = '';
    toast('Debt record deleted.');
  });
}

function bindDebtSectionEvents() {
  const defaultType = debtFilter === 'payable' ? 'payable' : 'receivable';

  document.getElementById('dashAddDebtBtn')?.addEventListener('click', () => {
    openAddDebtModal(defaultType);
  });

  document.getElementById('dashEmptyDebtBtn')?.addEventListener('click', () => {
    openAddDebtModal(defaultType);
  });

  document.querySelectorAll('[data-debt-filter]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const next = (e.currentTarget as HTMLElement).getAttribute('data-debt-filter') as DebtFilter | null;
      if (next) {
        debtFilter = next;
        render();
      }
    });
  });

  document.querySelectorAll('[data-repay-debt]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-repay-debt');
      if (id) openRepaymentModal(id);
    });
  });

  document.querySelectorAll('[data-delete-debt]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-delete-debt');
      if (id) openDeleteDebtConfirmModal(id);
    });
  });
}

function renderDebtsPage() {
  app.innerHTML = `
    <div class="min-h-screen pb-24 animate-fade-in flex flex-col justify-start">
      
      <header class="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-xs">
        <div class="max-w-md mx-auto flex items-center justify-between">
          <button onclick="location.hash='#/'" class="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            Home
          </button>
          <span class="text-sm font-bold text-slate-900">Debts & Credit</span>
          <button id="debtsPageAddBtn" class="text-xs font-bold text-emerald-800 hover:underline">
            ＋ Add
          </button>
        </div>
      </header>

      <main class="max-w-md mx-auto w-full px-4 pt-3 space-y-4">
        ${renderDashboardDebtSection(false)}
      </main>

      ${renderBottomNav('debts')}

    </div>
  `;

  document.getElementById('debtsPageAddBtn')?.addEventListener('click', () => {
    openAddDebtModal(debtFilter === 'payable' ? 'payable' : 'receivable');
  });

  bindDebtSectionEvents();
}

// -------------------------------------------------------------
// Bottom Navigation Bar Helper
// -------------------------------------------------------------
function renderBottomNav(activeTab: string): string {
  return `
    <nav class="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2 px-3 shadow-lg">
      <div class="max-w-md mx-auto grid grid-cols-5 gap-1 text-center">
        
        <button onclick="location.hash='#/'" class="nav-btn flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${activeTab === 'home' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          <span class="text-[10px] mt-0.5">Home</span>
        </button>

        <button onclick="location.hash='#/new'" class="nav-btn flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${activeTab === 'new' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          <span class="text-[10px] mt-0.5">New</span>
        </button>

        <button id="bottomNavLogPay" class="nav-btn flex flex-col items-center justify-center py-1 rounded-xl transition-colors text-slate-500 hover:text-slate-900">
          <span class="text-base font-black leading-none">₦</span>
          <span class="text-[10px] mt-0.5">Pay</span>
        </button>

        <button onclick="location.hash='#/debts'" class="nav-btn flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${activeTab === 'debts' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span class="text-[10px] mt-0.5">Debt</span>
        </button>

        <button onclick="location.hash='#/guide'" class="nav-btn flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${activeTab === 'guide' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
          <span class="text-[10px] mt-0.5">Guide</span>
        </button>

      </div>
    </nav>
  `;
}

function updateBottomNav(_route: string) {
  document.getElementById('bottomNavLogPay')?.addEventListener('click', () => {
    openLogPaymentModal();
  });
}

// Listen to Hash Changes & Store Changes
window.addEventListener('hashchange', render);
store.subscribe(render);

// Initial Render
render();

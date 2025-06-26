// Code Snippets Database - Main JavaScript File
// Configuration - change this to your JSON file path
const JSON_FILE_PATH = 'snippets.json';

// Pagination configuration
const ITEMS_PER_PAGE = 10; // Number of snippets per page
const MAX_PAGE_BUTTONS = 5; // Maximum number of page buttons to show

// Global state variables
let codeSnippets = [];
let filteredSnippets = [];
let activeLanguageFilter = '';
let activeTags = new Set();
let currentSort = 'title';
let searchTerm = '';
let currentPage = 1;
let totalPages = 1;

/**
 * Load snippets from JSON file
 */
async function loadSnippets() {
    try {
        const response = await fetch(JSON_FILE_PATH);
        if (!response.ok) {
            throw new Error(`Failed to load snippets: ${response.status}`);
        }
        codeSnippets = await response.json();
        filteredSnippets = [...codeSnippets];
        totalPages = Math.ceil(filteredSnippets.length / ITEMS_PER_PAGE);
        
        // Initialize the app after data is loaded
        populateLanguageFilter();
        populateTagsFilter();
        renderSnippets();
        updateStats();
        
        // Hide loading message
        document.getElementById('loadingMessage').style.display = 'none';
        document.getElementById('snippetsContainer').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading snippets:', error);
        showError('Failed to load code snippets. Please check that snippets.json exists and is properly formatted.');
    }
}

/**
 * Show error message to user
 */
function showError(message) {
    const container = document.getElementById('snippetsContainer');
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #dc3545; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px;">
            <h3>⚠️ Error Loading Snippets</h3>
            <p>${message}</p>
            <p style="margin-top: 15px; font-size: 0.9em; color: #721c24;">
                Make sure your JSON file is in the same directory as this HTML file.
            </p>
        </div>
    `;
    document.getElementById('loadingMessage').style.display = 'none';
}

/**
 * Initialize the application
 */
async function init() {
    await loadSnippets();
    setupEventListeners();
}

/**
 * Populate the language filter dropdown
 */
function populateLanguageFilter() {
    const languages = [...new Set(codeSnippets.map(snippet => snippet.language))];
    const select = document.getElementById('languageFilter');
    
    languages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = lang.charAt(0).toUpperCase() + lang.slice(1);
        select.appendChild(option);
    });
}

/**
 * Populate the tags filter section
 */
function populateTagsFilter() {
    const allTags = [...new Set(codeSnippets.flatMap(snippet => snippet.tags))];
    const container = document.getElementById('tagsContainer');
    
    allTags.forEach(tag => {
        const tagElement = document.createElement('div');
        tagElement.className = 'tag';
        tagElement.textContent = tag;
        tagElement.addEventListener('click', () => toggleTag(tag));
        container.appendChild(tagElement);
    });
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    document.getElementById('search').addEventListener('input', handleSearch);
    document.getElementById('languageFilter').addEventListener('change', handleLanguageFilter);
    document.getElementById('sortBy').addEventListener('change', handleSort);
}

/**
 * Handle search input changes
 */
function handleSearch(event) {
    searchTerm = event.target.value.toLowerCase();
    applyFilters();
}

/**
 * Handle language filter changes
 */
function handleLanguageFilter(event) {
    activeLanguageFilter = event.target.value;
    applyFilters();
}

/**
 * Handle sort option changes
 */
function handleSort(event) {
    currentSort = event.target.value;
    applyFilters();
}

/**
 * Toggle tag filter on/off
 */
function toggleTag(tag) {
    // Update the active tags set
    if (activeTags.has(tag)) {
        activeTags.delete(tag);
    } else {
        activeTags.add(tag);
    }
    
    // Update all tag elements with this text to reflect the new state
    const tagElements = document.querySelectorAll('#tagsContainer .tag');
    tagElements.forEach(el => {
        if (el.textContent === tag) {
            if (activeTags.has(tag)) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        }
    });
    
    applyFilters();
}

/**
 * Apply all active filters to the snippets
 */
function applyFilters() {
    filteredSnippets = codeSnippets.filter(snippet => {
        // Search filter
        const matchesSearch = !searchTerm || 
            snippet.title.toLowerCase().includes(searchTerm) ||
            snippet.description.toLowerCase().includes(searchTerm) ||
            snippet.code.toLowerCase().includes(searchTerm) ||
            snippet.tags.some(tag => tag.toLowerCase().includes(searchTerm));

        // Language filter
        const matchesLanguage = !activeLanguageFilter || snippet.language === activeLanguageFilter;

        // Tags filter
        const matchesTags = activeTags.size === 0 || 
            [...activeTags].every(tag => snippet.tags.includes(tag));

        return matchesSearch && matchesLanguage && matchesTags;
    });

    sortSnippets();
    
    // Reset to first page when filters change
    currentPage = 1;
    totalPages = Math.ceil(filteredSnippets.length / ITEMS_PER_PAGE);
    
    renderSnippets();
    renderPagination();
    updateStats();
}

/**
 * Sort the filtered snippets based on current sort option
 */
function sortSnippets() {
    filteredSnippets.sort((a, b) => {
        switch (currentSort) {
            case 'title':
                return a.title.localeCompare(b.title);
            case 'title-desc':
                return b.title.localeCompare(a.title);
            case 'language':
                return a.language.localeCompare(b.language);
            case 'date':
                return new Date(b.dateAdded) - new Date(a.dateAdded);
            default:
                return 0;
        }
    });
}

/**
 * Render the filtered snippets to the DOM (with pagination)
 */
function renderSnippets() {
    const container = document.getElementById('snippetsContainer');
    
    if (filteredSnippets.length === 0) {
        container.innerHTML = '<div class="no-results">No snippets match your criteria. Try adjusting your filters.</div>';
        renderPagination();
        return;
    }

    // Calculate pagination bounds
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedSnippets = filteredSnippets.slice(startIndex, endIndex);

    container.innerHTML = paginatedSnippets.map(snippet => `
        <div class="snippet-card">
            <div class="snippet-header">
                <div class="snippet-title">${escapeHtml(snippet.title)}</div>
                <div class="snippet-language">${escapeHtml(snippet.language)}</div>
            </div>
            <div class="snippet-description">${snippet.description}</div>
            <div class="snippet-code"><pre><code>${escapeHtml(snippet.code)}</code></pre></div>
            <div class="snippet-tags">
                ${snippet.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
        </div>
    `).join('');
    renderPagination();
}

/**
 * Render pagination controls
 */
function renderPagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="pagination">';
    
    // Previous button
    if (currentPage > 1) {
        paginationHTML += `<button class="page-btn" onclick="goToPage(${currentPage - 1})">‹ Previous</button>`;
    }
    
    // Calculate which page numbers to show
    let startPage = Math.max(1, currentPage - Math.floor(MAX_PAGE_BUTTONS / 2));
    let endPage = Math.min(totalPages, startPage + MAX_PAGE_BUTTONS - 1);
    
    // Adjust start if we're near the end
    if (endPage - startPage + 1 < MAX_PAGE_BUTTONS) {
        startPage = Math.max(1, endPage - MAX_PAGE_BUTTONS + 1);
    }
    
    // First page and ellipsis if needed
    if (startPage > 1) {
        paginationHTML += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += '<span class="ellipsis">...</span>';
        }
    }
    
    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage ? ' active' : '';
        paginationHTML += `<button class="page-btn${isActive}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    // Last page and ellipsis if needed
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += '<span class="ellipsis">...</span>';
        }
        paginationHTML += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    
    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `<button class="page-btn" onclick="goToPage(${currentPage + 1})">Next ›</button>`;
    }
    
    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;
}

/**
 * Navigate to a specific page
 */
function goToPage(page) {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
        currentPage = page;
        renderSnippets();
        renderPagination();
        updateStats();
        
        // Scroll to top of snippets container
        document.getElementById('snippetsContainer').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
}

/**
 * Update the statistics display
 */
function updateStats() {
    const stats = document.getElementById('stats');
    const total = codeSnippets.length;
    const filtered = filteredSnippets.length;
    
    if (filtered === 0) {
        stats.textContent = 'No snippets found';
        return;
    }
    
    if (totalPages <= 1) {
        // No pagination needed
        if (filtered === total) {
            stats.textContent = `Showing all ${total} code snippets`;
        } else {
            stats.textContent = `Showing ${filtered} of ${total} code snippets`;
        }
    } else {
        // With pagination
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1;
        const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, filtered);
        
        if (filtered === total) {
            stats.textContent = `Showing ${startIndex}-${endIndex} of ${total} code snippets (Page ${currentPage} of ${totalPages})`;
        } else {
            stats.textContent = `Showing ${startIndex}-${endIndex} of ${filtered} filtered snippets (${total} total) - Page ${currentPage} of ${totalPages}`;
        }
    }
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);
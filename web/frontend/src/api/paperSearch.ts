/**
 * Search for papers and download PDFs using public APIs
 */

export interface PaperSearchResult {
  doi?: string
  title: string
  authors: string[]
  year?: number
  journal?: string
  abstract?: string
  pdfUrl?: string
  openAccess: boolean
  source?: string
}

/**
 * Search papers by DOI or title using Semantic Scholar API
 */
export async function searchPapers(query: string): Promise<PaperSearchResult[]> {
  // If it looks like a DOI, search by DOI
  if (query.match(/^10\.\d{4,}/)) {
    const result = await searchByDOI(query)
    return result ? [result] : []
  }

  // Otherwise search by title
  return searchByTitle(query)
}

async function searchByDOI(doi: string): Promise<PaperSearchResult | null> {
  try {
    // Try Semantic Scholar first
    const res = await fetch(`https://api.semanticscholar.org/graph/v1/paper/DOI:${doi}?fields=title,authors,year,journal,abstract,openAccessPdf,externalIds`)
    if (res.ok) {
      const data = await res.json()
      return {
        doi: data.externalIds?.DOI || doi,
        title: data.title,
        authors: data.authors?.map((a: any) => a.name) || [],
        year: data.year,
        journal: data.journal?.name,
        abstract: data.abstract,
        pdfUrl: data.openAccessPdf?.url,
        openAccess: !!data.openAccessPdf?.url,
        source: 'Semantic Scholar',
      }
    }

    // Fallback to Unpaywall
    const unpaywall = await fetch(`https://api.unpaywall.org/v2/${doi}?email=user@example.com`)
    if (unpaywall.ok) {
      const data = await unpaywall.json()
      return {
        doi: data.doi,
        title: data.title,
        authors: data.z_authors?.map((a: any) => [a.given, a.family].filter(Boolean).join(' ')).filter(Boolean) || [],
        year: data.year ? parseInt(data.year) : undefined,
        journal: data.journal_name,
        abstract: undefined,
        pdfUrl: data.best_oa_location?.url_for_pdf,
        openAccess: data.is_oa,
        source: 'Unpaywall',
      }
    }
  } catch (err) {
    console.error('DOI search failed:', err)
  }
  return null
}

async function searchByTitle(title: string): Promise<PaperSearchResult[]> {
  try {
    const res = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(title)}&limit=10&fields=title,authors,year,journal,abstract,openAccessPdf,externalIds`)
    if (!res.ok) return []

    const data = await res.json()
    return (data.data || []).map((paper: any) => ({
      doi: paper.externalIds?.DOI,
      title: paper.title,
      authors: paper.authors?.map((a: any) => a.name) || [],
      year: paper.year,
      journal: paper.journal?.name,
      abstract: paper.abstract,
      pdfUrl: paper.openAccessPdf?.url,
      openAccess: !!paper.openAccessPdf?.url,
      source: 'Semantic Scholar',
    }))
  } catch (err) {
    console.error('Title search failed:', err)
    return []
  }
}

/**
 * Try to get PDF URL from Sci-Hub via DOI
 */
export async function getSciHubUrl(doi: string): Promise<string | null> {
  // Sci-Hub mirrors - try multiple
  const mirrors = [
    `https://sci-hub.se/${doi}`,
    `https://sci-hub.st/${doi}`,
    `https://sci-hub.ru/${doi}`,
  ]
  // Return the first mirror URL - user can try them
  return mirrors[0]
}

/**
 * Download PDF from URL and return as File object
 */
export async function downloadPDF(url: string, filename: string): Promise<File> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download PDF: ${res.status}`)

  const blob = await res.blob()
  return new File([blob], filename, { type: 'application/pdf' })
}

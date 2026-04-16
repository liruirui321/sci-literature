import { useData } from '../store/data'
import PaperCard from '../components/PaperCard'
import UploadZone from '../components/UploadZone'
import { FileText, Database } from 'lucide-react'

export default function Dashboard() {
  const { papers, dispatch, importPapersJsonl } = useData()

  const loadDemo = async () => {
    const demo: Array<Record<string, unknown>> = [
      {
        id: 'demo-1',
        title: 'Deep Learning for Single-Cell RNA-seq Analysis: A Survey',
        authors: ['Zhang, Y.', 'Li, X.', 'Wang, H.'],
        journal: 'Briefings in Bioinformatics',
        year: 2024,
        keywords: ['deep learning', 'scRNA-seq', 'cell clustering', 'trajectory inference'],
        method: 'Systematic review of 85 deep learning methods for scRNA-seq data analysis including autoencoders, GANs, and transformers.',
        findings: 'Transformer-based models show superior performance in cell type annotation tasks. Graph neural networks excel at spatial transcriptomics integration.',
        limitations: 'Most benchmarks use limited datasets. Lack of standardized evaluation metrics across studies. Computational cost not consistently reported.',
        reproducibility: 'Only 60% of reviewed papers provide code repositories. 40% have reproducible results with provided instructions.',
        abstract: 'Single-cell RNA sequencing has revolutionized our understanding of cellular heterogeneity. Deep learning methods have emerged as powerful tools for analyzing these complex datasets.',
      },
      {
        id: 'demo-2',
        title: 'Spatial Transcriptomics Reveals Tissue Architecture in Cancer Microenvironment',
        authors: ['Chen, L.', 'Wang, H.', 'Liu, R.', 'Zhang, Y.'],
        journal: 'Nature Methods',
        year: 2024,
        keywords: ['spatial transcriptomics', 'tumor microenvironment', 'cell-cell interaction', 'graph neural network'],
        method: 'Novel graph attention network (SpaGAT) integrating spatial coordinates with gene expression. Validated on 12 tissue samples across 4 cancer types.',
        findings: 'Identified 3 novel cell-cell communication patterns in pancreatic cancer. SpaGAT outperforms existing methods by 15% in spatial domain detection.',
        limitations: 'Limited to 10x Visium platform resolution. Requires high-quality tissue sections. Computational memory requirements scale quadratically with spot count.',
        reproducibility: 'Code available on GitHub with Docker container. All datasets deposited in GEO. Training takes ~4h on single A100 GPU.',
        abstract: 'Understanding the spatial organization of cells within tissues is fundamental to comprehending tissue function and disease mechanisms.',
      },
      {
        id: 'demo-3',
        title: 'Foundation Models for Genomic Sequence Understanding',
        authors: ['Liu, R.', 'Park, S.', 'Chen, L.'],
        journal: 'Genome Research',
        year: 2025,
        keywords: ['foundation model', 'genomics', 'transformer', 'DNA sequence', 'gene regulation'],
        method: 'Pre-trained transformer model (GenomeBERT) on 2.7 billion DNA sequences from 1,500 species. Fine-tuned on downstream tasks including promoter prediction and variant effect.',
        findings: 'GenomeBERT achieves state-of-the-art on 8 of 10 genomic benchmarks. Transfer learning from cross-species pre-training improves rare variant classification by 23%.',
        limitations: 'Pre-training requires 256 A100 GPUs for 2 weeks. Long-range genomic interactions beyond 10kb context not fully captured. Limited evaluation on non-coding variants.',
        reproducibility: 'Model weights and training code released. Benchmark suite provided. Fine-tuning guide with expected results documented.',
        abstract: 'Large language models have transformed natural language processing. We adapt this paradigm to genomic sequences, demonstrating that self-supervised pre-training captures fundamental biological patterns.',
      },
    ]
    const jsonl = demo.map(p => JSON.stringify(p)).join('\n')
    importPapersJsonl(jsonl)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">
            {papers.length} paper{papers.length !== 1 ? 's' : ''} loaded
          </p>
        </div>
        <button onClick={loadDemo} className="btn-secondary text-sm flex items-center gap-2">
          <Database className="w-4 h-4" />
          Load Demo Data
        </button>
      </div>

      <UploadZone
        accept=".jsonl,.json,.txt"
        label="Import papers.jsonl"
        onFile={importPapersJsonl}
      />

      {papers.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-400">No papers loaded</h3>
          <p className="text-sm text-gray-500 mt-1">
            Upload a papers.jsonl file or load demo data to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {papers.map(paper => (
            <PaperCard
              key={paper.id}
              paper={paper}
              onRemove={id => dispatch({ type: 'REMOVE_PAPER', payload: id })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

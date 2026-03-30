import { useState } from "react";
import { Search, Youtube, BarChart3, MessageSquare, AlertCircle, Loader2, CheckCircle2, ChevronRight, Quote, Download, FileText, Table, TrendingUp, TrendingDown, Clock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { analyzeComments, type AnalysisResult } from "./analysis/commentAnalysis";
import { cn } from "./lib/utils";
import Markdown from "react-markdown";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [progress, setProgress] = useState("");

  const extractVideoId = (url: string) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const handleAnalyze = async () => {
    if (!url) return;
    const videoId = extractVideoId(url);
    if (!videoId) {
      setError("Please enter a valid YouTube video URL.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgress("Fetching comments from YouTube...");

    try {
      const response = await fetch(`/api/comments?videoId=${videoId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch comments");
      }

      if (data.comments.length === 0) {
        throw new Error("No comments found for this video.");
      }

      setProgress(`Analyzing ${data.comments.length} comments with AI...`);
      const analysis = await analyzeComments(data.comments);
      setResult(analysis);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    const title = "Crawl: YouTube Comment Analysis Report";
    const videoId = extractVideoId(url) || "unknown";

    doc.setFontSize(20);
    doc.text(title, 14, 22);
    doc.setFontSize(10);
    doc.text(`Video URL: ${url}`, 14, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 35);

    doc.setFontSize(16);
    doc.text("Overall Summary", 14, 45);
    doc.setFontSize(11);
    const splitSummary = doc.splitTextToSize(result.summary, 180);
    doc.text(splitSummary, 14, 52);

    let currentY = 52 + (splitSummary.length * 5) + 10;

    doc.setFontSize(16);
    doc.text("Top 5 Insights", 14, currentY);
    currentY += 7;

    const insightsData = result.insights.map((insight, index) => [
      `#${index + 1} ${insight.title}`,
      `${insight.strength}%`,
      insight.explanation
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["Insight", "Strength", "Explanation"]],
      body: insightsData,
      theme: "striped",
      headStyles: { fillColor: [63, 72, 204] as any }, // brand-primary
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFontSize(16);
    doc.text("Video Analytics", 14, currentY);
    currentY += 7;

    const analyticsData = result.videoAnalytics.timeline.map(moment => [
      moment.timestampRange,
      moment.type.toUpperCase(),
      moment.explanation
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["Timestamp", "Type", "Explanation"]],
      body: analyticsData,
      theme: "grid",
    });

    doc.save(`Crawl_Analysis_${videoId}.pdf`);
  };

  const handleDownloadCSV = () => {
    if (!result) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Section,Title/Timestamp,Value/Type,Description\n";
    csvContent += `Summary,Overall Summary,,"${result.summary.replace(/"/g, '""')}"\n`;
    csvContent += `Summary,General Tone,"${result.generalTone}",\n`;
    result.insights.forEach((insight, i) => {
      csvContent += `Insight,"${insight.title}",${insight.strength}%,"${insight.explanation.replace(/"/g, '""')}"\n`;
      insight.examples.forEach(ex => {
        csvContent += `Example,"${insight.title}",,"${ex.replace(/"/g, '""')}"\n`;
      });
    });
    result.videoAnalytics.timeline.forEach(moment => {
      csvContent += `Analytics,"${moment.timestampRange}",${moment.type},"${moment.explanation.replace(/"/g, '""')}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Crawl_Analysis_${extractVideoId(url)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartData = result?.insights.map(insight => ({
    name: insight.title,
    strength: insight.strength
  })) || [];

  const COLORS = ['#3F48CC', '#66E08A', '#4F46E5', '#10B981', '#6366F1'];

  return (
    <div className="min-h-screen bg-brand-bg font-sans selection:bg-brand-primary selection:text-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-black/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-primary p-1.5 rounded-lg shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-brand-text-primary">Crawl</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-xs font-semibold text-brand-text-secondary uppercase tracking-widest">
              Creator Intelligence
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold text-brand-text-primary mb-4 tracking-tight">
            Audience Insights for <span className="text-brand-primary">Modern Creators</span>
          </h2>
          <p className="text-lg text-brand-text-secondary mb-10 font-normal">
            Analyze viewer sentiment, recurring themes, and engagement trends in seconds.
          </p>

          <div className="relative group max-w-xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Youtube className="h-5 w-5 text-brand-text-secondary group-focus-within:text-brand-primary transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-11 pr-32 py-4 bg-white border border-black/5 rounded-xl leading-5 placeholder-brand-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all shadow-sm text-base"
              placeholder="Paste YouTube video link..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading || !url}
              className="absolute right-2 top-2 bottom-2 px-6 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing
                </>
              ) : (
                "Analyze"
              )}
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-white/50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm font-medium"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </motion.div>
          )}
        </div>

        {/* Loading State */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-16 h-16 border-4 border-brand-primary/10 border-t-brand-primary rounded-full animate-spin"></div>
              <p className="mt-8 text-lg font-semibold text-brand-text-primary">{progress}</p>
              <p className="mt-2 text-sm text-brand-text-secondary">Processing audience signals...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Dashboard */}
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Export Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-black/5 rounded-lg text-sm font-semibold text-brand-text-primary hover:bg-gray-50 transition-all shadow-sm"
              >
                <FileText className="w-4 h-4 text-brand-primary" />
                Export PDF
              </button>
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-black/5 rounded-lg text-sm font-semibold text-brand-text-primary hover:bg-gray-50 transition-all shadow-sm"
              >
                <Table className="w-4 h-4 text-brand-secondary" />
                Export CSV
              </button>
            </div>

            {/* Summary & Tone Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-black/5">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-brand-primary/5 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-brand-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-brand-text-primary tracking-tight">Audience Summary</h3>
                </div>
                <div className="prose prose-slate max-w-none text-brand-text-primary leading-relaxed font-normal">
                  <Markdown>{result.summary}</Markdown>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
                  <h4 className="text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-4">Sentiment Tone</h4>
                  <p className="text-xl font-bold text-brand-text-primary">{result.generalTone}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
                  <h4 className="text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-4">Recurring Feedback</h4>
                  <ul className="space-y-4">
                    {result.commonRequests.map((req, i) => (
                      <li key={i} className="flex items-start gap-3 text-brand-text-primary text-sm font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-1.5 flex-shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Video Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-black/5">
                <div className="flex items-center gap-3 mb-10">
                  <div className="p-2 bg-brand-secondary/10 rounded-lg">
                    <Clock className="w-6 h-6 text-brand-secondary" />
                  </div>
                  <h3 className="text-2xl font-bold text-brand-text-primary tracking-tight">Engagement Timeline</h3>
                </div>
                
                <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-black/5">
                  {result.videoAnalytics.timeline.map((moment, i) => (
                    <div key={i} className="relative pl-12">
                      <div className={cn(
                        "absolute left-0 top-1 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm",
                        moment.type === 'peak' ? "bg-brand-secondary/20" : "bg-red-50"
                      )}>
                        {moment.type === 'peak' ? (
                          <TrendingUp className="w-4 h-4 text-brand-secondary" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                        <span className="text-xs font-bold text-brand-text-primary bg-brand-bg px-2.5 py-1 rounded-md">
                          {moment.timestampRange}
                        </span>
                        <span className={cn(
                          "text-xs font-bold uppercase tracking-widest",
                          moment.type === 'peak' ? "text-brand-secondary" : "text-red-600"
                        )}>
                          {moment.type === 'peak' ? "Retention Peak" : "Engagement Drop"}
                        </span>
                      </div>
                      <p className="text-brand-text-secondary text-sm leading-relaxed">{moment.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
                  <h4 className="text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-4">Top Segment</h4>
                  <p className="text-brand-text-primary font-bold text-lg">{result.videoAnalytics.mostEngagingSegment}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
                  <h4 className="text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-4">Weakest Segment</h4>
                  <p className="text-brand-text-primary font-bold text-lg">{result.videoAnalytics.weakestSegment}</p>
                </div>
              </div>
            </div>

            {/* Insights Visualization */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-black/5">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-primary/5 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-brand-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-brand-text-primary tracking-tight">Insight Strength</h3>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#00000008" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      width={150}
                      tick={{ fontSize: 12, fontWeight: 600, fill: '#111111' }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#00000005' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="strength" radius={[0, 4, 4, 0]} barSize={24}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top 5 Insights List */}
            <div className="space-y-8">
              <h3 className="text-2xl font-bold text-brand-text-primary tracking-tight flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-brand-primary" />
                Audience Deep-Dive
              </h3>
              <div className="grid grid-cols-1 gap-8">
                {result.insights.map((insight, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden"
                  >
                    <div className="p-8">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded uppercase tracking-widest">
                              Insight {idx + 1}
                            </span>
                            <span className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-widest">
                              Prevalence: {insight.strength}%
                            </span>
                          </div>
                          <h4 className="text-2xl font-bold text-brand-text-primary tracking-tight">{insight.title}</h4>
                        </div>
                        <div className="w-full md:w-48 h-1.5 bg-brand-bg rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-1000" 
                            style={{ width: `${insight.strength}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                        </div>
                      </div>
                      
                      <p className="text-brand-text-primary text-lg leading-relaxed mb-10 font-normal">
                        {insight.explanation}
                      </p>

                      <div className="space-y-6">
                        <h5 className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-widest flex items-center gap-2">
                          <Quote className="w-3 h-3" />
                          Supporting Signals
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {insight.examples.map((example, i) => (
                            <div key={i} className="p-5 bg-brand-bg/30 rounded-xl border border-black/5 text-sm italic text-brand-text-primary relative leading-relaxed">
                              "{example}"
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </main>

      <footer className="bg-white/50 border-t border-black/5 py-16 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-brand-primary" />
            <span className="font-bold text-brand-text-primary text-lg tracking-tight">Crawl</span>
          </div>
          <p className="text-sm text-brand-text-secondary font-medium">
            Creator Intelligence Platform. &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Upload, Wand2, FileText, Trash2, Download } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Template } from '../../types/template';


export default function CustomTemplateHub() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    name: '',
    description: '',
    file: null as File | null,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadData({ ...uploadData, file });
    }
  };

  const handleUpload = async () => {
    if (!uploadData.file || !uploadData.name) {
      alert('Please provide a template name and file');
      return;
    }

    setUploading(true);

    try {
      const fileExt = uploadData.file.name.split('.').pop();
      const fileName = ${Math.random()}.${fileExt};
      const filePath = templates/${fileName};

      const { error: uploadError } = await supabase.storage
        .from('templates')
        .upload(filePath, uploadData.file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('templates')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('templates')
        .insert({
          name: uploadData.name,
          description: uploadData.description,
          file_url: publicUrl,
          user_id: 'anonymous',
        });

      if (insertError) throw insertError;

      setUploadData({ name: '', description: '', file: null });
      setShowUploadModal(false);
      fetchTemplates();
    } catch (error) {
      console.error('Error uploading template:', error);
      alert('Error uploading template. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Custom Template Hub</h1>
              <p className="text-slate-400 mt-1">
                Upload and manage your school's or organization's official certificate templates. Once uploaded, you can modify the layout, text, and integrate data using AI tools.
              </p>
            </div>
          </div>
        </div>

        {templates.length === 0 && !loading ? (
          <div className="bg-slate-800 rounded-3xl p-16 text-center border border-slate-700">
            <div className="w-32 h-32 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <Upload className="w-16 h-16 text-blue-400" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-3">Upload Your Template</h2>
            <p className="text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed">
              Get started by uploading your custom certificate design. Once uploaded, you can modify the layout, text, and integrate data using AI-powered tools.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Upload Template
              </button>
              <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                Use AI Adaptation
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8 flex justify-end">
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Upload New Template
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-slate-400 mt-4">Loading templates...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 hover:border-blue-500 transition-all group"
                  >
                    <div className="aspect-video bg-slate-700 flex items-center justify-center">
                      {template.thumbnail_url ? (
                        <img
                          src={template.thumbnail_url}
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileText className="w-16 h-16 text-slate-500" />
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-white mb-2">{template.name}</h3>
                      <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                        {template.description || 'No description provided'}
                      </p>
                      <div className="flex gap-2">
                        <a
                          href={template.file_url}
                          download
                          className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </a>
                        <button
                         onClick={() => template.id && handleDelete(template.id)}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6">Upload Template</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={uploadData.name}
                  onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Certificate of Achievement"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Brief description of the template..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Template File *
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500 file:text-white file:cursor-pointer"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 text-white rounded-xl font-medium transition-colors"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
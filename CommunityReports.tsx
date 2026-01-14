import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ThumbsUp,
  Award,
  Globe,
  LogOut,
  ArrowLeft,
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { supabase, Report, UserStats } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const translations = {
  English: {
    appTitle: 'Roadfix Connect',
    communityReports: 'Community Reports',
    communityHint: 'Confirm issues reported by others to help prioritize them',
    noCommunityReports: 'No community reports available',
    confirmIssue: 'Confirm Issue',
    confirmed: 'Confirmed',
    points: 'pts',
    contributor: 'Road Safety Contributor',
    logout: 'Logout',
    backToDashboard: 'Back to Dashboard',
    aiVerified: 'AI Verified',
    highPriorityLabel: 'High Priority',
    verifiedBy: 'Verified by',
    citizen: 'citizen',
    citizens: 'citizens',
    escalated: 'Escalated',
    myReport: 'Your Report',
    loadingReports: 'Loading community reports...',
    pending: 'Pending',
    inProgress: 'In Progress',
    resolved: 'Resolved',
  }
};

export default function CommunityReports() {
  const [communityReports, setCommunityReports] = useState<Report[]>([]);
  const [confirmedReports, setConfirmedReports] = useState<Set<string>>(new Set());
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [loadingReports, setLoadingReports] = useState(true);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const t = translations[selectedLanguage as keyof typeof translations];

  useEffect(() => {
    fetchCommunityReports();
    fetchUserStats();
    fetchUserConfirmations();
  }, [user]);

  const fetchCommunityReports = async () => {
    setLoadingReports(true);
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    setCommunityReports(data || []);
    setLoadingReports(false);
  };

  const fetchUserStats = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setUserStats(data);
  };

  const fetchUserConfirmations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('report_confirmations')
      .select('report_id')
      .eq('user_id', user.id);

    setConfirmedReports(new Set(data?.map(c => c.report_id) || []));
  };

  const handleConfirmReport = async (reportId: string) => {
    if (!user) return;

    const { data } = await supabase.rpc('add_report_confirmation', {
      report_id_param: reportId,
      user_id_param: user.id
    });

    if (data) {
      setConfirmedReports(new Set([...confirmedReports, reportId]));
      fetchCommunityReports();
      fetchUserStats();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getStatusColor = (status: string) => {
    if (status === 'Pending') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (status === 'In Progress') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (status === 'Resolved') return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'High') return 'bg-red-100 text-red-800 border-red-200';
    if (priority === 'Medium') return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto p-6">
        {loadingReports ? (
          <p>{t.loadingReports}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {communityReports.map((report) => (
              <div key={report.id} className="border rounded-lg overflow-hidden bg-white">

                {/* ✅ IMAGE FIX START */}
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  {report.image_url && report.issue_type !== 'Wrong Parking' ? (
                    <img
                      src={report.image_url}
                      alt={report.issue_type}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm text-gray-500 italic">
                      Image removed due to irrelevance
                    </span>
                  )}
                </div>
                {/* ✅ IMAGE FIX END */}

                <div className="p-4 space-y-2">
                  <h3 className="font-semibold">{report.issue_type}</h3>
                  <p className="text-sm text-gray-600">{report.description}</p>

                  <div className="flex gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(report.priority)}`}>
                      {report.priority}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(report.status)}`}>
                      {report.status}
                    </span>
                  </div>

                  {report.user_id !== user?.id && !confirmedReports.has(report.id) && (
                    <button
                      onClick={() => handleConfirmReport(report.id)}
                      className="w-full mt-2 bg-green-600 text-white py-2 rounded"
                    >
                      {t.confirmIssue}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

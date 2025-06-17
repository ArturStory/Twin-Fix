import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

export default function Problems() {
  const { t } = useTranslation();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch problems/notifications from the API
    const fetchIssues = async () => {
      try {
        const response = await fetch('/api/issues');
        if (response.ok) {
          const data = await response.json();
          setIssues(data);
        }
      } catch (error) {
        console.error("Error fetching issues:", error);
        // Use a small sample of issues for demonstration
        setIssues([
          {
            id: 1,
            title: 'Zepsuty ekspres do kawy',
            description: 'Ekspres do kawy na piętrze nie działa poprawnie.',
            status: 'pending',
            created_at: new Date().toISOString(),
            reporter: { username: 'Jan Kowalski' },
            location: 'Kuchnia, 1 piętro'
          },
          {
            id: 2,
            title: 'Kran przecieka',
            description: 'Kran w łazience na parterze przecieka.',
            status: 'in_progress',
            created_at: new Date().toISOString(),
            reporter: { username: 'Anna Nowak' },
            location: 'Łazienka, parter'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();

    // Set up event listener for WebSocket events
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'issue_created' || data.type === 'issue_updated') {
          fetchIssues();
        }
      } catch (error) {
        console.error('Error parsing WebSocket message', error);
      }
    };

    // Try to connect to WebSocket if available
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);
      
      socket.addEventListener('message', handleWebSocketMessage);
      
      return () => {
        socket.removeEventListener('message', handleWebSocketMessage);
        socket.close();
      };
    } catch (error) {
      console.error('Could not connect to WebSocket', error);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('problems.title') || 'Problemy'}</h1>
        <Badge variant="outline" className="px-3 py-1.5">
          <Bell className="w-4 h-4 mr-2" />
          {issues.length}
        </Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : issues.length === 0 ? (
        <Card className="bg-gray-50 dark:bg-gray-800">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t('problems.no_issues') || 'Brak zgłoszonych problemów'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {issues.map((issue: any) => (
            <Card key={issue.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{issue.title}</CardTitle>
                    <CardDescription>
                      {t('problems.reported_by')}: {issue.reporter?.username || 'Unknown'} • 
                      {new Date(issue.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge className={
                    issue.status === 'pending' ? 'bg-yellow-500' :
                    issue.status === 'in_progress' ? 'bg-blue-500' :
                    issue.status === 'completed' ? 'bg-green-500' :
                    issue.status === 'urgent' ? 'bg-red-500' : 'bg-gray-500'
                  }>
                    {issue.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{issue.description}</p>
                {issue.location && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('problems.location')}: {issue.location}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CalendarCheck, 
  CalendarClock,
  ClipboardCheck, 
  Filter, 
  PlusCircle, 
  Search, 
  X 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Fetch inspections from backend

const InspectionsPage = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [showInspectionDialog, setShowInspectionDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [inspectionToDelete, setInspectionToDelete] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch inspections from backend
  useEffect(() => {
    const fetchInspections = async () => {
      try {
        const response = await fetch('/api/inspections');
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched inspections:', data);
          setInspections(data);
        } else {
          console.error('Failed to fetch inspections, status:', response.status);
        }
      } catch (error) {
        console.error('Error fetching inspections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInspections();
  }, []);
  
  const filteredInspections = inspections.filter(inspection => 
    inspection.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inspection.area?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inspection.assignee?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-gray-500">Loading inspections...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('inspections.title', 'Inspection Management')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('inspections.subtitle', 'Schedule, track, and manage equipment inspections')}
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('inspections.createNew', 'Create New Inspection')}
        </Button>
      </div>

      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle>{t('inspections.overview', 'Inspections Overview')}</CardTitle>
          <CardDescription>
            {t('inspections.overviewDescription', 'Monitor inspection status and schedule')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-full">
                  <CalendarCheck className="h-6 w-6 text-blue-700 dark:text-blue-300" />
                </div>
                <div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                    {t('inspections.completed', 'Completed')}
                  </div>
                  <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">1</div>
                </div>
              </div>
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-100 dark:border-amber-800">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 dark:bg-amber-800 p-2 rounded-full">
                  <CalendarClock className="h-6 w-6 text-amber-700 dark:text-amber-300" />
                </div>
                <div>
                  <div className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                    {t('inspections.scheduled', 'Scheduled')}
                  </div>
                  <div className="text-2xl font-bold text-amber-800 dark:text-amber-200">3</div>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 dark:bg-red-800 p-2 rounded-full">
                  <ClipboardCheck className="h-6 w-6 text-red-700 dark:text-red-300" />
                </div>
                <div>
                  <div className="text-sm text-red-700 dark:text-red-300 font-medium">
                    {t('inspections.overdue', 'Overdue')}
                  </div>
                  <div className="text-2xl font-bold text-red-800 dark:text-red-200">1</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4 w-full grid grid-cols-4">
          <TabsTrigger value="all" className="text-xs px-2 py-1.5">{t('inspections.allInspections', 'Inspections')}</TabsTrigger>
          <TabsTrigger value="scheduled" className="text-xs px-2 py-1.5">{t('inspections.scheduled', 'Scheduled')}</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs px-2 py-1.5">{t('inspections.completed', 'Completed')}</TabsTrigger>
          <TabsTrigger value="overdue" className="text-xs px-2 py-1.5">{t('inspections.overdue', 'Overdue')}</TabsTrigger>
        </TabsList>
        
        <div className="flex justify-end mb-4">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              type="search"
              placeholder={t('inspections.search', 'Search inspections...')}
              className="pl-9 w-full sm:w-64"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="absolute right-2.5 top-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <TabsContent value="all" className="mt-0">
          <Card>
            <Table>
              <TableCaption>{t('inspections.tableCaption', 'List of inspections for restaurant equipment')}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inspections.inspectionTitle', 'Inspection Title')}</TableHead>
                  <TableHead>{t('inspections.area', 'Area')}</TableHead>
                  <TableHead>{t('inspections.assignee', 'Assignee')}</TableHead>
                  <TableHead>{t('inspections.dueDate', 'Due Date')}</TableHead>
                  <TableHead>{t('inspections.status', 'Status')}</TableHead>
                  <TableHead>{t('inspections.priority', 'Priority')}</TableHead>
                  <TableHead className="text-right">{t('inspections.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInspections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      {t('inspections.noInspectionsFound', 'No inspections found matching your criteria')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInspections.map(inspection => (
                    <TableRow key={inspection.id}>
                      <TableCell className="font-medium">{inspection.title}</TableCell>
                      <TableCell>{inspection.area}</TableCell>
                      <TableCell>{inspection.assignee}</TableCell>
                      <TableCell>{new Date(inspection.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`
                            ${inspection.status === 'completed' ? 'border-green-500 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' : ''}
                            ${inspection.status === 'scheduled' ? 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800' : ''}
                            ${inspection.status === 'overdue' ? 'border-red-500 text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800' : ''}
                          `}
                        >
                          {inspection.status === 'completed' && t('inspections.statusCompleted', 'Completed')}
                          {inspection.status === 'scheduled' && t('inspections.statusScheduled', 'Scheduled')}
                          {inspection.status === 'overdue' && t('inspections.statusOverdue', 'Overdue')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`
                            ${inspection.priority === 'high' ? 'border-red-500 text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800' : ''}
                            ${inspection.priority === 'medium' ? 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800' : ''}
                            ${inspection.priority === 'low' ? 'border-green-500 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' : ''}
                          `}
                        >
                          {inspection.priority === 'high' && t('inspections.priorityHigh', 'High')}
                          {inspection.priority === 'medium' && t('inspections.priorityMedium', 'Medium')}
                          {inspection.priority === 'low' && t('inspections.priorityLow', 'Low')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedInspection(inspection);
                              setShowInspectionDialog(true);
                            }}
                          >
                            {t('inspections.view', 'View')}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditFormData(inspection);
                              setShowEditDialog(true);
                            }}
                          >
                            {t('inspections.edit', 'Edit')}
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => {
                              setInspectionToDelete(inspection);
                              setShowDeleteDialog(true);
                            }}
                          >
                            {t('common.delete', 'Delete')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        
        <TabsContent value="scheduled" className="mt-0">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inspections.inspectionTitle', 'Inspection Title')}</TableHead>
                  <TableHead>{t('inspections.area', 'Area')}</TableHead>
                  <TableHead>{t('inspections.assignee', 'Assignee')}</TableHead>
                  <TableHead>{t('inspections.dueDate', 'Due Date')}</TableHead>
                  <TableHead>{t('inspections.priority', 'Priority')}</TableHead>
                  <TableHead className="text-right">{t('inspections.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInspections
                  .filter(inspection => inspection.status === 'scheduled')
                  .map(inspection => (
                    <TableRow key={inspection.id}>
                      <TableCell className="font-medium">{inspection.title}</TableCell>
                      <TableCell>{inspection.area}</TableCell>
                      <TableCell>{inspection.assignee}</TableCell>
                      <TableCell>{new Date(inspection.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`
                            ${inspection.priority === 'high' ? 'border-red-500 text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800' : ''}
                            ${inspection.priority === 'medium' ? 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800' : ''}
                            ${inspection.priority === 'low' ? 'border-green-500 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' : ''}
                          `}
                        >
                          {inspection.priority === 'high' && t('inspections.priorityHigh', 'High')}
                          {inspection.priority === 'medium' && t('inspections.priorityMedium', 'Medium')}
                          {inspection.priority === 'low' && t('inspections.priorityLow', 'Low')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm">
                            {t('inspections.view', 'View')}
                          </Button>
                          <Button variant="outline" size="sm">
                            {t('inspections.edit', 'Edit')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        
        <TabsContent value="completed" className="mt-0">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inspections.inspectionTitle', 'Inspection Title')}</TableHead>
                  <TableHead>{t('inspections.area', 'Area')}</TableHead>
                  <TableHead>{t('inspections.assignee', 'Assignee')}</TableHead>
                  <TableHead>{t('inspections.completedDate', 'Completed Date')}</TableHead>
                  <TableHead className="text-right">{t('inspections.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInspections
                  .filter(inspection => inspection.status === 'completed')
                  .map(inspection => (
                    <TableRow key={inspection.id}>
                      <TableCell className="font-medium">{inspection.title}</TableCell>
                      <TableCell>{inspection.area}</TableCell>
                      <TableCell>{inspection.assignee}</TableCell>
                      <TableCell>{new Date(inspection.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">
                          {t('inspections.viewReport', 'View Report')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        
        <TabsContent value="overdue" className="mt-0">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inspections.inspectionTitle', 'Inspection Title')}</TableHead>
                  <TableHead>{t('inspections.area', 'Area')}</TableHead>
                  <TableHead>{t('inspections.assignee', 'Assignee')}</TableHead>
                  <TableHead>{t('inspections.dueDate', 'Due Date')}</TableHead>
                  <TableHead>{t('inspections.daysOverdue', 'Days Overdue')}</TableHead>
                  <TableHead className="text-right">{t('inspections.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInspections
                  .filter(inspection => inspection.status === 'overdue')
                  .map(inspection => {
                    const dueDate = new Date(inspection.dueDate);
                    const today = new Date();
                    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
                    
                    return (
                      <TableRow key={inspection.id}>
                        <TableCell className="font-medium">{inspection.title}</TableCell>
                        <TableCell>{inspection.area}</TableCell>
                        <TableCell>{inspection.assignee}</TableCell>
                        <TableCell>{dueDate.toLocaleDateString()}</TableCell>
                        <TableCell className="text-red-600 font-medium">{daysOverdue}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm">
                              {t('inspections.reschedule', 'Reschedule')}
                            </Button>
                            <Button variant="outline" size="sm" className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200">
                              {t('inspections.markUrgent', 'Mark Urgent')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Inspection Details Modal */}
      <Dialog open={showInspectionDialog} onOpenChange={setShowInspectionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('inspections.inspectionDetails', 'Inspection Details')}</DialogTitle>
            <DialogDescription>
              {t('inspections.detailsDescription', 'View complete information about this inspection')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedInspection && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('inspections.inspectionTitle', 'Inspection Title')}</label>
                  <p className="mt-1 text-sm font-medium">{selectedInspection.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('inspections.area', 'Area')}</label>
                  <p className="mt-1 text-sm">{selectedInspection.area}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('inspections.assignee', 'Assignee')}</label>
                  <p className="mt-1 text-sm">{selectedInspection.assignee}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('inspections.dueDate', 'Due Date')}</label>
                  <p className="mt-1 text-sm">{new Date(selectedInspection.dueDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('inspections.status', 'Status')}</label>
                  <p className="mt-1">
                    <Badge
                      variant="outline"
                      className={`
                        ${selectedInspection.status === 'completed' ? 'border-green-500 text-green-700 bg-green-50' : ''}
                        ${selectedInspection.status === 'scheduled' ? 'border-blue-500 text-blue-700 bg-blue-50' : ''}
                        ${selectedInspection.status === 'overdue' ? 'border-red-500 text-red-700 bg-red-50' : ''}
                      `}
                    >
                      {selectedInspection.status === 'completed' && t('inspections.completed', 'Completed')}
                      {selectedInspection.status === 'scheduled' && t('inspections.scheduled', 'Scheduled')}
                      {selectedInspection.status === 'overdue' && t('inspections.overdue', 'Overdue')}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('inspections.priority', 'Priority')}</label>
                  <p className="mt-1">
                    <Badge
                      variant="outline"
                      className={`
                        ${selectedInspection.priority === 'high' ? 'border-red-500 text-red-700 bg-red-50' : ''}
                        ${selectedInspection.priority === 'medium' ? 'border-amber-500 text-amber-700 bg-amber-50' : ''}
                        ${selectedInspection.priority === 'low' ? 'border-green-500 text-green-700 bg-green-50' : ''}
                      `}
                    >
                      {selectedInspection.priority === 'high' && t('inspections.priorityHigh', 'High')}
                      {selectedInspection.priority === 'medium' && t('inspections.priorityMedium', 'Medium')}
                      {selectedInspection.priority === 'low' && t('inspections.priorityLow', 'Low')}
                    </Badge>
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowInspectionDialog(false)}>
                  {t('common.close', 'Close')}
                </Button>
                <Button onClick={() => {
                  setEditFormData(selectedInspection);
                  setShowInspectionDialog(false);
                  setShowEditDialog(true);
                }}>
                  {t('inspections.edit', 'Edit')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Inspection Modal */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('inspections.editInspection', 'Edit Inspection')}</DialogTitle>
            <DialogDescription>
              {t('inspections.editDescription', 'Update inspection details and settings')}
            </DialogDescription>
          </DialogHeader>
          
          {editFormData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t('inspections.inspectionTitle', 'Inspection Title')}</label>
                  <input 
                    type="text" 
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('inspections.area', 'Area')}</label>
                  <select 
                    value={editFormData.area}
                    onChange={(e) => setEditFormData({...editFormData, area: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Kitchen">{t('locations.kitchen', 'Kitchen')}</option>
                    <option value="Dining Area">{t('locations.diningArea', 'Dining Area')}</option>
                    <option value="Storage">{t('locations.storage', 'Storage')}</option>
                    <option value="All Areas">{t('locations.allAreas', 'All Areas')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t('inspections.assignee', 'Assignee')}</label>
                  <input 
                    type="text" 
                    value={editFormData.assignee}
                    onChange={(e) => setEditFormData({...editFormData, assignee: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('inspections.dueDate', 'Due Date')}</label>
                  <input 
                    type="date" 
                    value={editFormData.dueDate}
                    onChange={(e) => setEditFormData({...editFormData, dueDate: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('inspections.status', 'Status')}</label>
                  <select 
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="scheduled">{t('inspections.scheduled', 'Scheduled')}</option>
                    <option value="completed">{t('inspections.completed', 'Completed')}</option>
                    <option value="overdue">{t('inspections.overdue', 'Overdue')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t('inspections.priority', 'Priority')}</label>
                  <select 
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({...editFormData, priority: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">{t('inspections.priorityLow', 'Low')}</option>
                    <option value="medium">{t('inspections.priorityMedium', 'Medium')}</option>
                    <option value="high">{t('inspections.priorityHigh', 'High')}</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button onClick={() => {
                  console.log('Saving inspection changes:', editFormData);
                  setShowEditDialog(false);
                }}>
                  {t('common.save', 'Save Changes')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inspections.deleteInspection', 'Delete Inspection')}</DialogTitle>
            <DialogDescription>
              {t('inspections.deleteDescription', 'Are you sure you want to delete this inspection? This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          
          {inspectionToDelete && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{inspectionToDelete.title}</p>
                <p className="text-sm text-gray-500">{inspectionToDelete.area} • {inspectionToDelete.assignee}</p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button variant="destructive" onClick={async () => {
                  try {
                    const response = await fetch(`/api/inspections/${inspectionToDelete.id}`, {
                      method: 'DELETE',
                    });
                    
                    if (response.ok) {
                      // Successfully deleted - remove from local state
                      setInspections(prevInspections => 
                        prevInspections.filter(inspection => inspection.id !== inspectionToDelete.id)
                      );
                      setShowDeleteDialog(false);
                      setInspectionToDelete(null);
                    } else {
                      console.error('Failed to delete inspection');
                    }
                  } catch (error) {
                    console.error('Error deleting inspection:', error);
                  }
                }}>
                  {t('common.delete', 'Delete')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InspectionsPage;
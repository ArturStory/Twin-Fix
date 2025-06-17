import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, UserRole } from "@shared/schema";
import { Redirect } from "wouter";

// UI components
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function UserManagement() {
  const { t, i18n } = useTranslation();
  const { user: userCtx } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    username: "",
    email: "",
    role: "",
    phone: "",
    position: "",
  });

  // Check if the current user is an Admin or Owner
  const canManageUsers = userCtx?.role === UserRole.ADMIN || userCtx?.role === UserRole.OWNER;
  
  // Admins and Owners can delete users
  const canDeleteUsers = userCtx?.role === UserRole.ADMIN || userCtx?.role === UserRole.OWNER;

  // If not authorized, redirect to homepage
  if (!canManageUsers) {
    return <Redirect to="/" />;
  }

  // Fetch all users - only real users from database
  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ['/api/users'],
    staleTime: 0, // Always fetch fresh data
    queryFn: async () => {
      console.log("User Management API called - EMERGENCY ACCESS GRANTED");
      
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      if (!selectedUser) throw new Error("No user selected");
      const res = await apiRequest("PUT", `/api/users/${selectedUser.id}`, userData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update user");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: t("userManagement.updateSuccess") || "User updated",
        description: t("userManagement.updateSuccessDetail") || "User information has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: t("userManagement.updateError") || "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) throw new Error("No user selected");
      const res = await apiRequest("DELETE", `/api/users/${selectedUser.id}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete user");
      }
      return true;
    },
    onSuccess: () => {
      toast({
        title: t("userManagement.deleteSuccess") || "User deleted", 
        description: t("userManagement.deleteSuccessDetail") || "User has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.refetchQueries({ queryKey: ['/api/users'] });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast({
        title: t("userManagement.deleteError") || "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle edit button click
  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      username: user.username,
      email: user.email,
      role: user.role,
      phone: user.phone || "",
      position: user.position || "",
    });
    setIsEditDialogOpen(true);
  };

  // Handle delete button click
  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle role selection
  const handleRoleChange = (value: string) => {
    setEditFormData(prev => ({ ...prev, role: value }));
  };

  // Handle save button click
  const handleSaveClick = () => {
    updateUserMutation.mutate(editFormData);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    deleteUserMutation.mutate();
  };

  // Get initials for avatar fallback
  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>{t("userManagement.loadError") || "Error loading users"}</p>
              <p className="text-sm">{error instanceof Error ? error.message : "Unknown error"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("userManagement.title") || "User Management"}</CardTitle>
          <CardDescription>
            {t("userManagement.description") || "Manage user accounts and permissions"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("userManagement.userColumn") || "User"}</TableHead>
                <TableHead>{t("userManagement.emailColumn") || "Email"}</TableHead>
                <TableHead>{t("userManagement.roleColumn") || "Role"}</TableHead>
                <TableHead>{t("userManagement.phoneColumn") || "Phone"}</TableHead>
                <TableHead>{t("userManagement.positionColumn") || "Position"}</TableHead>
                <TableHead className="text-right">{t("userManagement.actionsColumn") || "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={user.photo || undefined} alt={user.username} />
                        <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                      </Avatar>
                      <span>{user.username}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {(() => {
                      const roleTranslations = {
                        admin: { en: 'Admin', es: 'Administrador', pl: 'Administrator' },
                        owner: { en: 'Owner', es: 'Propietario', pl: 'Właściciel' },
                        manager: { en: 'Manager', es: 'Gerente', pl: 'Menedżer' },
                        repairman: { en: 'Repairman', es: 'Técnico', pl: 'Technik' },
                        reporter: { en: 'Reporter', es: 'Reportero', pl: 'Reporter' }
                      };
                      const role = user.role.toLowerCase();
                      const lang = i18n.language as 'en' | 'es' | 'pl';
                      return roleTranslations[role as keyof typeof roleTranslations]?.[lang] || user.role;
                    })()}
                  </TableCell>
                  <TableCell>{user.phone || "-"}</TableCell>
                  <TableCell>{user.position || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditClick(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {canDeleteUsers && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDeleteClick(user)}
                          disabled={user.id === userCtx?.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Edit User Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("userManagement.editTitle") || "Edit User"}</DialogTitle>
                <DialogDescription>
                  {t("userManagement.editDescription") || "Make changes to this user's information."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right">
                    {t("profile.username") || "Username"}
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    value={editFormData.username}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    {t("profile.email") || "Email"}
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={editFormData.email}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    {t("profile.role") || "Role"}
                  </Label>
                  <Select value={editFormData.role} onValueChange={handleRoleChange}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder={t("profile.selectRole") || "Select a role"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>
                          {i18n.language === 'en' ? 'User Roles' : 
                           i18n.language === 'es' ? 'Roles de Usuario' : 
                           'Role Użytkowników'}
                        </SelectLabel>
                        <SelectItem value={UserRole.ADMIN}>
                          {i18n.language === 'en' ? 'Admin' : 
                           i18n.language === 'es' ? 'Administrador' : 
                           'Administrator'}
                        </SelectItem>
                        <SelectItem value={UserRole.OWNER}>
                          {i18n.language === 'en' ? 'Owner' : 
                           i18n.language === 'es' ? 'Propietario' : 
                           'Właściciel'}
                        </SelectItem>
                        <SelectItem value={UserRole.MANAGER}>
                          {i18n.language === 'en' ? 'Manager' : 
                           i18n.language === 'es' ? 'Gerente' : 
                           'Menedżer'}
                        </SelectItem>
                        <SelectItem value={UserRole.REPAIRMAN}>
                          {i18n.language === 'en' ? 'Repairman' : 
                           i18n.language === 'es' ? 'Técnico' : 
                           'Technik'}
                        </SelectItem>
                        <SelectItem value={UserRole.REPORTER}>
                          {i18n.language === 'en' ? 'Reporter' : 
                           i18n.language === 'es' ? 'Reportero' : 
                           'Reporter'}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">
                    {t("profile.phone") || "Phone"}
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={editFormData.phone}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="position" className="text-right">
                    {t("profile.position") || "Position"}
                  </Label>
                  <Input
                    id="position"
                    name="position"
                    value={editFormData.position}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  {t("common.cancel") || "Cancel"}
                </Button>
                <Button onClick={handleSaveClick} disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("common.saving") || "Saving..."}
                    </>
                  ) : (
                    t("common.save") || "Save"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete User Dialog */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("userManagement.deleteTitle") || "Delete User"}</DialogTitle>
                <DialogDescription>
                  {t("userManagement.deleteDescription") || "Are you sure you want to delete this user? This action cannot be undone."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                  {t("common.cancel") || "Cancel"}
                </Button>
                <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteUserMutation.isPending}>
                  {deleteUserMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("common.deleting") || "Deleting..."}
                    </>
                  ) : (
                    t("common.delete") || "Delete"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
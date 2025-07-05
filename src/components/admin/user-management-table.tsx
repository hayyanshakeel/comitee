
'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoreHorizontal, PlusCircle, Trash2, FileDown, DollarSign, Loader2, Pencil } from 'lucide-react';
import type { User, Payment } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { AddPaymentDialog } from './add-payment-dialog';
import { useToast } from '@/hooks/use-toast';
import { AddMissedPaymentDialog } from './add-missed-payment-dialog';
import { ManagePaymentsDialog } from './manage-payments-dialog';

interface UserManagementTableProps {
  users: User[];
  payments: Payment[];
}

export function UserManagementTable({ users: initialUsers, payments }: UserManagementTableProps) {
  // We use initialUsers to avoid prop drilling issues with state
  const users = initialUsers.filter(u => u.email !== 'sheikhhayyaan@gmail.com');

  const { toast } = useToast();

  // State for dialogs
  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = React.useState(false);
  const [isDeleteUserOpen, setIsDeleteUserOpen] = React.useState(false);
  const [isAddMissedPaymentOpen, setIsAddMissedPaymentOpen] = React.useState(false);
  const [isManagePaymentsOpen, setIsManagePaymentsOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  
  // State for forms
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [newUserName, setNewUserName] = React.useState('');
  const [newUserEmail, setNewUserEmail] = React.useState('');
  const [newUserMobile, setNewUserMobile] = React.useState('');
  const [newUserPassword, setNewUserPassword] = React.useState('');
  const [formError, setFormError] = React.useState('');


  const resetAddUserForm = () => {
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserMobile('');
    setFormError('');
  }

  const handleAddUser = async () => {
    setFormError('');
    if (!newUserName || !newUserEmail || !newUserPassword || !newUserMobile) {
        setFormError('Please fill in all fields.');
        return;
    }
    setIsSubmitting(true);
    try {
        const response = await fetch('/api/manage-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newUserName, email: newUserEmail, mobile: newUserMobile, password: newUserPassword }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to add user.');
        }
        toast({ title: 'Success', description: 'User has been added successfully.' });
        setIsAddUserOpen(false);
        resetAddUserForm();
    } catch (err: any) {
        setFormError(err.message);
        console.error("Error adding user:", err);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
        const response = await fetch('/api/manage-user', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: selectedUser.id }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to delete user.');
        }
        toast({ title: 'Success', description: data.message || 'User and their payments have been deleted.' });
        setIsDeleteUserOpen(false);
        setSelectedUser(null);
    } catch (err: any) {
        console.error("Error deleting user:", err);
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteUserOpen(true);
  }

  const openAddPaymentDialog = (user: User) => {
    setSelectedUser(user);
    setIsAddPaymentOpen(true);
  }

  const openAddMissedPaymentDialog = (user: User) => {
    setSelectedUser(user);
    setIsAddMissedPaymentOpen(true);
  }
  
  const openManagePaymentsDialog = (user: User) => {
    setSelectedUser(user);
    setIsManagePaymentsOpen(true);
  }

  const exportUserData = (user: User) => {
    const userPayments = payments.filter(p => p.userId === user.id);
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Month,Year,Amount,Status,PaidOn\n"
      + userPayments.map(p => `${p.month},${p.year},${p.amount},${p.status},${p.paidOn || ''}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${user.name.replace(' ', '_')}_payment_history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>Manage committee members and their payments.</CardDescription>
          </div>
          <Button onClick={() => setIsAddUserOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Mobile</TableHead>
              <TableHead className="hidden md:table-cell">Total Paid</TableHead>
              <TableHead className="hidden md:table-cell">Total Pending</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const userPayments = payments.filter((p) => p.userId === user.id);
              const totalPaid = userPayments
                .filter((p) => p.status === 'Paid')
                .reduce((acc, p) => acc + p.amount, 0);
              const totalPending = userPayments
                .filter((p) => p.status === 'Pending')
                .reduce((acc, p) => acc + p.amount, 0);

              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{user.email}</TableCell>
                  <TableCell className="hidden lg:table-cell">{user.mobile || 'N/A'}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="secondary" className="text-green-600">
                      ₹{totalPaid.toLocaleString()}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="text-orange-600">
                      ₹{totalPending.toLocaleString()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openManagePaymentsDialog(user)}>
                           <Pencil className="mr-2 h-4 w-4" /> Manage Payments
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openAddPaymentDialog(user)}>
                           <DollarSign className="mr-2 h-4 w-4" /> Add Manual Payment
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openAddMissedPaymentDialog(user)}>
                           <PlusCircle className="mr-2 h-4 w-4" /> Add Missed Payment
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => exportUserData(user)}>
                          <FileDown className="mr-2 h-4 w-4" /> Export Data
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => openDeleteDialog(user)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={(open) => { setIsAddUserOpen(open); if (!open) resetAddUserForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account. They will be able to log in with the email and password you provide.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Full Name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="user@example.com" />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input id="mobile" type="tel" value={newUserMobile} onChange={(e) => setNewUserMobile(e.target.value)} placeholder="e.g. 9876543210" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Must be at least 6 characters" />
            </div>
            {formError && <p className="text-center text-xs font-medium text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" onClick={handleAddUser} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Manual Payment Dialog */}
      {selectedUser && (
        <AddPaymentDialog
            isOpen={isAddPaymentOpen}
            setIsOpen={setIsAddPaymentOpen}
            user={selectedUser}
        />
      )}

      {/* Add Missed Payment Dialog */}
      {selectedUser && (
        <AddMissedPaymentDialog
            isOpen={isAddMissedPaymentOpen}
            setIsOpen={setIsAddMissedPaymentOpen}
            user={selectedUser}
        />
      )}

       {/* Manage Payments Dialog */}
      {selectedUser && (
        <ManagePaymentsDialog
            isOpen={isManagePaymentsOpen}
            setIsOpen={setIsManagePaymentsOpen}
            user={selectedUser}
            payments={payments}
        />
      )}

      {/* Delete User Alert Dialog */}
      <AlertDialog open={isDeleteUserOpen} onOpenChange={setIsDeleteUserOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the account for {selectedUser?.name} and all of their associated payment history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

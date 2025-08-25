'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { telephonyApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Phone, Building2, Target, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export function ManualCallForm() {
  const [businessName, setBusinessName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [goal, setGoal] = useState('');

  const { mutate: makeManualCall, isPending } = useMutation({
    mutationFn: async () => {
      // Validate phone number format
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        throw new Error('Please enter a valid phone number');
      }

      // Add +1 if not present and number is 10 digits
      const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;
      
      return telephonyApi.initiateManualCall(businessName, formattedPhone, goal);
    },
    onSuccess: (data) => {
      toast.success(`Call initiated! Call ID: ${data.callSid.slice(-8)}`);
      // Clear form
      setBusinessName('');
      setPhoneNumber('');
      setGoal('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to initiate call');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!businessName.trim() || !phoneNumber.trim() || !goal.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    makeManualCall();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Manual Call
        </CardTitle>
        <CardDescription>
          Call a business not in the database by entering details manually
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Business Name *
            </Label>
            <Input
              id="businessName"
              placeholder="e.g., Acme Corporation"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number *
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="e.g., (555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Call Goal *
            </Label>
            <Textarea
              id="goal"
              placeholder="e.g., Get the contact information of the HR manager"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              disabled={isPending}
              rows={3}
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will create a temporary business record and initiate a call immediately.
              The call will be tracked in the workflow history.
            </AlertDescription>
          </Alert>

          <Button 
            type="submit" 
            disabled={isPending || !businessName.trim() || !phoneNumber.trim() || !goal.trim()}
            className="w-full"
          >
            {isPending ? 'Initiating Call...' : 'Start Call'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { addCompetitor } from '@/app/(app)/competitors/actions';
import { toast } from 'sonner';

export function AddCompetitorDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    const result = await addCompetitor(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Competitor added successfully');
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Competitor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Competitor</DialogTitle>
          <DialogDescription>
            Add a new company to track for competitive intelligence signals.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name *</Label>
            <Input id="name" name="name" placeholder="e.g., Placemakr" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website URL *</Label>
            <Input
              id="website"
              name="website"
              type="url"
              placeholder="https://www.placemakr.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="careers_url">Careers Page URL</Label>
            <Input
              id="careers_url"
              name="careers_url"
              type="url"
              placeholder="https://www.placemakr.com/careers"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Brief description of the competitor..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Competitor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

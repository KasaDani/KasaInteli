'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { LottieState } from '@/components/motion/lottie-state';
import {
  Plus,
  Search,
  Loader2,
  CheckCircle2,
  Globe,
  Briefcase,
  Building,
  Linkedin,
  Smartphone,
  Users,
  ChevronDown,
  ChevronRight,
  Sparkles,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { addCompetitor } from '@/app/(app)/competitors/actions';
import { toast } from 'sonner';

const ease = [0.21, 0.47, 0.32, 0.98] as const;

interface LookupResult {
  name: string;
  website: string;
  careers_url: string;
  description: string;
  linkedin_slug: string;
  listings_url: string;
  app_store_url: string;
  glassdoor_url: string;
}

type Phase = 'search' | 'review' | 'success';

/** Small pill that shows which fields were auto-detected */
function AutoTag() {
  return (
    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal gap-1 ml-auto">
      <Sparkles className="h-2.5 w-2.5" />
      auto
    </Badge>
  );
}

export function AddCompetitorDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('search');
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Track which fields were auto-filled
  const [autoFields, setAutoFields] = useState<Set<string>>(new Set());

  // Form state
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [careersUrl, setCareersUrl] = useState('');
  const [listingsUrl, setListingsUrl] = useState('');
  const [linkedinSlug, setLinkedinSlug] = useState('');
  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [glassdoorUrl, setGlassdoorUrl] = useState('');
  const [secCik, setSecCik] = useState('');
  const [description, setDescription] = useState('');

  function resetForm() {
    setName('');
    setWebsite('');
    setCareersUrl('');
    setListingsUrl('');
    setLinkedinSlug('');
    setAppStoreUrl('');
    setGlassdoorUrl('');
    setSecCik('');
    setDescription('');
    setAutoFields(new Set());
    setPhase('search');
    setLookupError('');
    setShowAdvanced(false);
  }

  async function handleLookup() {
    if (!name.trim()) {
      toast.error('Enter a company name first');
      return;
    }

    setLookupLoading(true);
    setLookupError('');

    try {
      const response = await fetch(
        `/api/lookup-competitor?name=${encodeURIComponent(name.trim())}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Lookup failed');
      }

      const result: LookupResult = await response.json();
      const filled = new Set<string>();

      if (result.website) { setWebsite(result.website); filled.add('website'); }
      if (result.careers_url) { setCareersUrl(result.careers_url); filled.add('careers_url'); }
      if (result.description) { setDescription(result.description); filled.add('description'); }
      if (result.linkedin_slug) { setLinkedinSlug(result.linkedin_slug); filled.add('linkedin_slug'); }
      if (result.listings_url) { setListingsUrl(result.listings_url); filled.add('listings_url'); }
      if (result.app_store_url) { setAppStoreUrl(result.app_store_url); filled.add('app_store_url'); }
      if (result.glassdoor_url) { setGlassdoorUrl(result.glassdoor_url); filled.add('glassdoor_url'); }

      setAutoFields(filled);

      // Expand advanced section if any advanced fields were found
      if (filled.has('linkedin_slug') || filled.has('app_store_url') || filled.has('glassdoor_url')) {
        setShowAdvanced(true);
      }

      if (filled.size === 0) {
        toast.info('Couldn\'t auto-detect company details. You can fill them in manually.');
      }

      setPhase('review');
    } catch (err) {
      setLookupError(
        err instanceof Error ? err.message : 'Lookup failed. You can fill in details manually.'
      );
    } finally {
      setLookupLoading(false);
    }
  }

  function handleSkipLookup() {
    setPhase('review');
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    // Ensure all fields are included even if "More Sources" section is collapsed
    if (!formData.has('linkedin_slug') || !formData.get('linkedin_slug')) {
      formData.set('linkedin_slug', linkedinSlug);
    }
    if (!formData.has('app_store_url') || !formData.get('app_store_url')) {
      formData.set('app_store_url', appStoreUrl);
    }
    if (!formData.has('glassdoor_url') || !formData.get('glassdoor_url')) {
      formData.set('glassdoor_url', glassdoorUrl);
    }
    if (!formData.has('sec_cik') || !formData.get('sec_cik')) {
      formData.set('sec_cik', secCik);
    }
    const result = await addCompetitor(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      const competitorId = result.competitorId;

      // Show success phase briefly
      setPhase('success');
      setTimeout(() => {
        toast.success(`${name} added! Collecting intelligence signals...`);
        resetForm();
        setOpen(false);

        // Navigate and trigger collection
        if (competitorId) {
          router.push(`/competitors/${competitorId}`);

          fetch('/api/collect-initial', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ competitorId }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.totalInserted > 0) {
                toast.success(
                  `Found ${data.totalInserted} signals for ${name} (${data.newsCount} news, ${data.jobsCount} jobs)`,
                  { duration: 8000 }
                );
              } else {
                toast.info('No historical signals found. Signals will be collected by scheduled monitors.', { duration: 6000 });
              }
            })
            .catch(() => {
              toast.info('Signal collection is running in the background.', { duration: 4000 });
            });
        }
      }, 1500);
    }
  }

  const filledCount = autoFields.size;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Competitor
          </Button>
        </motion.div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* ── PHASE 1: SEARCH ────────────────────────────── */}
          {phase === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease }}
            >
              <DialogHeader>
                <DialogTitle>Add Competitor</DialogTitle>
              </DialogHeader>

              <div className="py-2">
                <p className="text-sm text-muted-foreground mb-5">
                  Enter a company name and we&apos;ll automatically find their website, careers page,
                  LinkedIn, and more.
                </p>

                {/* Search hero */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Company name, e.g. Placemakr"
                      className="pl-10 h-12 text-base"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setLookupError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleLookup();
                        }
                      }}
                      autoFocus
                    />
                  </div>

                  <motion.div whileTap={{ scale: 0.98 }}>
                    <Button
                      className="w-full h-11"
                      onClick={handleLookup}
                      disabled={lookupLoading || !name.trim()}
                    >
                      {lookupLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Detecting company info...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Auto-detect Company Info
                        </>
                      )}
                    </Button>
                  </motion.div>

                  <AnimatePresence>
                    {lookupError && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm overflow-hidden"
                      >
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <p className="text-destructive font-medium">{lookupError}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative my-5">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
                    or
                  </span>
                </div>

                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={handleSkipLookup}
                  disabled={!name.trim()}
                >
                  Fill in manually
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── PHASE 2: REVIEW & EDIT ────────────────────── */}
          {phase === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25, ease }}
            >
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <DialogTitle className="flex-1">
                    {name}
                  </DialogTitle>
                  {filledCount > 0 && (
                    <Badge variant="outline" className="gap-1 font-normal shrink-0">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      {filledCount} field{filledCount !== 1 ? 's' : ''} auto-filled
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              <form ref={formRef} action={handleSubmit} className="space-y-5 pt-1">
                {/* Hidden name field */}
                <input type="hidden" name="name" value={name} />

                {/* ── Core Info ── */}
                <div className="space-y-4">
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.3, ease }}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      <Label htmlFor="website" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Website
                      </Label>
                      {autoFields.has('website') && <AutoTag />}
                    </div>
                    <Input
                      id="website"
                      name="website"
                      type="url"
                      placeholder="https://www.example.com"
                      required
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className={autoFields.has('website') ? 'ring-1 ring-primary/30 animate-[pulse_0.5s_ease-in-out_1]' : ''}
                    />
                  </motion.div>

                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.3, ease }}
                  >
                    <div className="flex items-center gap-2">
                      <Label htmlFor="description" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Description
                      </Label>
                      {autoFields.has('description') && <AutoTag />}
                    </div>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="What does this company do?"
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className={`resize-none text-sm ${autoFields.has('description') ? 'ring-1 ring-primary/30 animate-[pulse_0.5s_ease-in-out_1]' : ''}`}
                    />
                  </motion.div>
                </div>

                <Separator />

                {/* ── Signal Sources ── */}
                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.3, ease }}
                >
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Signal Sources
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Careers URL */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-3 w-3 text-muted-foreground" />
                        <Label htmlFor="careers_url" className="text-xs">Careers Page</Label>
                        {autoFields.has('careers_url') && <AutoTag />}
                      </div>
                      <Input
                        id="careers_url"
                        name="careers_url"
                        type="url"
                        placeholder="https://..."
                        value={careersUrl}
                        onChange={(e) => setCareersUrl(e.target.value)}
                        className={`h-9 text-sm ${autoFields.has('careers_url') ? 'ring-1 ring-primary/30' : ''}`}
                      />
                    </div>

                    {/* Listings URL */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Building className="h-3 w-3 text-muted-foreground" />
                        <Label htmlFor="listings_url" className="text-xs">Listings Page</Label>
                        {autoFields.has('listings_url') && <AutoTag />}
                      </div>
                      <Input
                        id="listings_url"
                        name="listings_url"
                        type="url"
                        placeholder="https://..."
                        value={listingsUrl}
                        onChange={(e) => setListingsUrl(e.target.value)}
                        className={`h-9 text-sm ${autoFields.has('listings_url') ? 'ring-1 ring-primary/30' : ''}`}
                      />
                    </div>

                    {/* LinkedIn Slug */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Linkedin className="h-3 w-3 text-muted-foreground" />
                        <Label htmlFor="linkedin_slug" className="text-xs">LinkedIn Slug</Label>
                        {autoFields.has('linkedin_slug') && <AutoTag />}
                      </div>
                      <Input
                        id="linkedin_slug"
                        name="linkedin_slug"
                        placeholder="company-slug"
                        value={linkedinSlug}
                        onChange={(e) => setLinkedinSlug(e.target.value)}
                        className={`h-9 text-sm ${autoFields.has('linkedin_slug') ? 'ring-1 ring-primary/30' : ''}`}
                      />
                    </div>
                  </div>
                </motion.div>

                {/* ── Advanced Sources (collapsible) ── */}
                <div>
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    <span className="uppercase tracking-wider">More Sources</span>
                    {!showAdvanced && (appStoreUrl || glassdoorUrl || secCik) && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                        {[appStoreUrl, glassdoorUrl, secCik].filter(Boolean).length} configured
                      </Badge>
                    )}
                  </button>

                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                          {/* App Store URL */}
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <Smartphone className="h-3 w-3 text-muted-foreground" />
                              <Label htmlFor="app_store_url" className="text-xs">App Store</Label>
                              {autoFields.has('app_store_url') && <AutoTag />}
                            </div>
                            <Input
                              id="app_store_url"
                              name="app_store_url"
                              type="url"
                              placeholder="https://apps.apple.com/..."
                              value={appStoreUrl}
                              onChange={(e) => setAppStoreUrl(e.target.value)}
                              className={`h-9 text-sm ${autoFields.has('app_store_url') ? 'ring-1 ring-primary/30' : ''}`}
                            />
                          </div>

                          {/* Glassdoor URL */}
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <Label htmlFor="glassdoor_url" className="text-xs">Glassdoor</Label>
                              {autoFields.has('glassdoor_url') && <AutoTag />}
                            </div>
                            <Input
                              id="glassdoor_url"
                              name="glassdoor_url"
                              type="url"
                              placeholder="https://glassdoor.com/..."
                              value={glassdoorUrl}
                              onChange={(e) => setGlassdoorUrl(e.target.value)}
                              className={`h-9 text-sm ${autoFields.has('glassdoor_url') ? 'ring-1 ring-primary/30' : ''}`}
                            />
                          </div>

                          {/* SEC CIK (for public companies) */}
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <Label htmlFor="sec_cik" className="text-xs">SEC CIK</Label>
                            </div>
                            <Input
                              id="sec_cik"
                              name="sec_cik"
                              placeholder="e.g., 0001819395 (public companies)"
                              value={secCik}
                              onChange={(e) => setSecCik(e.target.value)}
                              className="h-9 text-sm"
                            />
                            <p className="text-[10px] text-muted-foreground">For SEC filing tracking. Find at sec.gov/cgi-bin/browse-edgar</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Separator />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPhase('search');
                      setWebsite('');
                      setCareersUrl('');
                      setListingsUrl('');
                      setLinkedinSlug('');
                      setAppStoreUrl('');
                      setGlassdoorUrl('');
                      setSecCik('');
                      setDescription('');
                      setAutoFields(new Set());
                      setShowAdvanced(false);
                    }}
                  >
                    Back
                  </Button>
                  <div className="flex-1" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button type="submit" disabled={loading || !website}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Competitor
                        </>
                      )}
                    </Button>
                  </motion.div>
                </DialogFooter>
              </form>
            </motion.div>
          )}

          {/* ── PHASE 3: SUCCESS ────────────────────── */}
          {phase === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, ease }}
              className="flex flex-col items-center justify-center py-8"
            >
              <LottieState name="success-check" size={120} loop={false} />
              <p className="text-lg font-semibold mt-4">{name} added!</p>
              <p className="text-sm text-muted-foreground mt-1">Collecting intelligence signals...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

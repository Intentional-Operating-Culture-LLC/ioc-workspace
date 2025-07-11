import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  EnvelopeIcon,
  UserPlusIcon,
  TrashIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';

interface RaterInvitationProps {
  assessmentId: string;
  assessmentTitle: string;
  subjectName: string;
  onSendInvitations: (raters: RaterInfo[]) => Promise<void>;
}

interface RaterInfo {
  id?: string;
  name: string;
  email: string;
  relationship: 'peer' | 'direct_report' | 'manager' | 'other';
  customRelationship?: string;
}

const RELATIONSHIP_LABELS = {
  peer: 'Peer / Colleague',
  direct_report: 'Direct Report',
  manager: 'Manager / Supervisor',
  other: 'Other'
};

const EMAIL_TEMPLATES = {
  default: `Dear [RATER_NAME],

You have been selected to provide feedback for [SUBJECT_NAME] as part of their 360-degree assessment: "[ASSESSMENT_TITLE]".

Your honest and constructive feedback is valuable in helping [SUBJECT_NAME] understand their strengths and identify areas for development.

The assessment will take approximately 15-20 minutes to complete. All responses are confidential and will be aggregated with other feedback.

Please click the link below to begin the assessment:
[ASSESSMENT_LINK]

This assessment will remain open until [DEADLINE].

Thank you for your participation.

Best regards,
[ORGANIZATION_NAME]`,
  
  peer: `Hi [RATER_NAME],

[SUBJECT_NAME] has invited you to participate in their 360-degree feedback assessment as a peer colleague.

Your perspective on [SUBJECT_NAME]'s collaboration, communication, and teamwork is important for their professional development.

The assessment takes about 15-20 minutes and your responses will be kept confidential.

Click here to start: [ASSESSMENT_LINK]

Deadline: [DEADLINE]

Thanks for supporting your colleague's growth!`,
  
  manager: `Dear [RATER_NAME],

As [SUBJECT_NAME]'s manager, your feedback is crucial for their 360-degree assessment: "[ASSESSMENT_TITLE]".

Your insights on their performance, potential, and development areas will help create a comprehensive view of their capabilities.

Please complete the assessment by [DEADLINE]: [ASSESSMENT_LINK]

Thank you for investing in your team member's development.`
};

export const RaterInvitation: React.FC<RaterInvitationProps> = ({
  assessmentId,
  assessmentTitle,
  subjectName,
  onSendInvitations
}) => {
  const [raters, setRaters] = useState<RaterInfo[]>([]);
  const [newRater, setNewRater] = useState<RaterInfo>({
    name: '',
    email: '',
    relationship: 'peer'
  });
  const [emailTemplate, setEmailTemplate] = useState('default');
  const [customMessage, setCustomMessage] = useState(EMAIL_TEMPLATES.default);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const addRater = () => {
    const newErrors: Record<string, string> = {};
    
    if (!newRater.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!newRater.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(newRater.email)) {
      newErrors.email = 'Invalid email format';
    } else if (raters.some(r => r.email.toLowerCase() === newRater.email.toLowerCase())) {
      newErrors.email = 'This email has already been added';
    }
    
    if (newRater.relationship === 'other' && !newRater.customRelationship?.trim()) {
      newErrors.customRelationship = 'Please specify the relationship';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setRaters([...raters, { ...newRater, id: Date.now().toString() }]);
    setNewRater({ name: '', email: '', relationship: 'peer' });
    setErrors({});
  };

  const removeRater = (id: string) => {
    setRaters(raters.filter(r => r.id !== id));
  };

  const handleTemplateChange = (template: string) => {
    setEmailTemplate(template);
    setCustomMessage(EMAIL_TEMPLATES[template as keyof typeof EMAIL_TEMPLATES] || EMAIL_TEMPLATES.default);
  };

  const handleSubmit = async () => {
    if (raters.length === 0) {
      setErrors({ general: 'Please add at least one rater' });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSendInvitations(raters);
    } catch (error) {
      setErrors({ general: 'Failed to send invitations. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatersByRelationship = () => {
    const grouped: Record<string, RaterInfo[]> = {};
    raters.forEach(rater => {
      const key = rater.relationship;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(rater);
    });
    return grouped;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Invite 360° Feedback Raters</h2>
          <p className="mt-2 text-gray-600">
            Select colleagues to provide feedback for <span className="font-semibold">{subjectName}</span>'s assessment
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Add Rater Form */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Rater</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={newRater.name}
                  onChange={(e) => {
                    setNewRater({ ...newRater, name: e.target.value });
                    setErrors({ ...errors, name: '' });
                  }}
                  className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="John Doe"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={newRater.email}
                  onChange={(e) => {
                    setNewRater({ ...newRater, email: e.target.value });
                    setErrors({ ...errors, email: '' });
                  }}
                  className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="relationship" className="block text-sm font-medium text-gray-700">
                  Relationship
                </label>
                <select
                  id="relationship"
                  value={newRater.relationship}
                  onChange={(e) => setNewRater({ ...newRater, relationship: e.target.value as any })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {newRater.relationship === 'other' && (
              <div className="mt-4">
                <input
                  type="text"
                  value={newRater.customRelationship || ''}
                  onChange={(e) => {
                    setNewRater({ ...newRater, customRelationship: e.target.value });
                    setErrors({ ...errors, customRelationship: '' });
                  }}
                  className={`block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.customRelationship ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Specify relationship (e.g., Client, Mentor, Board Member)"
                />
                {errors.customRelationship && (
                  <p className="mt-1 text-sm text-red-600">{errors.customRelationship}</p>
                )}
              </div>
            )}

            <button
              onClick={addRater}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <UserPlusIcon className="h-4 w-4 mr-2" />
              Add Rater
            </button>
          </div>

          {/* Raters List */}
          {raters.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Selected Raters ({raters.length})
              </h3>
              <div className="space-y-4">
                {Object.entries(getRatersByRelationship()).map(([relationship, groupRaters]) => (
                  <div key={relationship}>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      {RELATIONSHIP_LABELS[relationship as keyof typeof RELATIONSHIP_LABELS]} ({groupRaters.length})
                    </h4>
                    <div className="space-y-2">
                      {groupRaters.map((rater) => (
                        <motion.div
                          key={rater.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-3 bg-white border rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                            <div>
                              <div className="font-medium text-gray-900">{rater.name}</div>
                              <div className="text-sm text-gray-500">{rater.email}</div>
                              {rater.customRelationship && (
                                <div className="text-xs text-gray-500">{rater.customRelationship}</div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeRater(rater.id!)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email Template */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Template</h3>
            <div className="mb-4">
              <label htmlFor="template" className="block text-sm font-medium text-gray-700">
                Choose Template
              </label>
              <select
                id="template"
                value={emailTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="default">Default Template</option>
                <option value="peer">Peer Template</option>
                <option value="manager">Manager Template</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                Email Message
              </label>
              <textarea
                id="message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={8}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-2 text-sm text-gray-500">
                Variables: [RATER_NAME], [SUBJECT_NAME], [ASSESSMENT_TITLE], [ASSESSMENT_LINK], [DEADLINE], [ORGANIZATION_NAME]
              </p>
            </div>
          </div>

          {/* Error Messages */}
          {errors.general && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{errors.general}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <button
              onClick={() => navigator.clipboard.writeText(raters.map(r => `${r.name} <${r.email}>`).join('\n'))}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
              Copy Rater List
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || raters.length === 0}
              className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                  Send {raters.length} Invitation{raters.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
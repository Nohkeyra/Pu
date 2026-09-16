import { ghost } from './actions';
import { GhostAction } from './types';

export interface DemoScriptOptions {
  applyDemoUpdate?: (key: string, value: any) => void;
  applyDemoStep?: (step: number) => void;
}

interface ScriptStep {
  action: GhostAction;
  afterStep?: number;
}

export function getDemoScript(): GhostAction[] {
  const steps: ScriptStep[] = [
    {
      action: ghost.tap(
        '[data-tour="step1-event-type"]',
        {
          title: "Step 1 — Event type",
          body: "Choose Pejabat for office, or Lain for other events.",
          position: "bottom",
          duration: 2200,
        },
        { demoUpdate: { eventType: 'pejabat' } }
      ),
    },
    {
      action: ghost.tap(
        '[data-tour="step1-meal-sarapan"]',
        {
          title: "Pick your meal times",
          body: "Sarapan, Tengahari, or Hi-Tea. You can pick more than one.",
          position: "bottom",
          duration: 2000,
        },
        { demoUpdate: { mealTypes: ['sarapan'] } }
      ),
    },
    {
      action: ghost.tap(
        '[data-tour="step1-prep-buffet"]',
        {
          title: "Preparation style",
          body: "Buffet for a shared spread, or Meal Box for individual portions.",
          position: "bottom",
          duration: 2000,
        },
        { demoUpdate: { preparationType: 'buffet' } }
      ),
    },
    {
      action: ghost.tap(
        '[data-tour="step1-guests-plus"]',
        {
          title: "How many guests?",
          body: "Set the total number of people you're catering for.",
          position: "bottom",
          duration: 1800,
        },
        { demoUpdate: { guests: 50 } }
      ),
    },
    {
      action: ghost.tap(
        '[data-tour="step1-next"]',
        {
          title: "Continue to menu",
          body: "Next, we'll pick the dishes.",
          position: "top",
          duration: 1500,
        },
        { demoUpdate: {} }
      ),
      afterStep: 2,
    },
    {
      action: ghost.wait(700),
    },
    {
      action: ghost.tap(
        '[data-tour="step2-dish-1"]',
        {
          title: "Step 2 — Choose dishes",
          body: "Tap any dish to add it to your menu.",
          position: "bottom",
          duration: 2000,
        },
        {
          demoUpdate: {
            dishes: [
              {
                id: 'asam_pedas',
                nameEn: 'Asam Pedas',
                nameBm: 'Asam Pedas',
                descEn: 'Fresh fish cooked in spicy, tangy herbal gravy',
                descBm: 'Ikan segar dimasak asam pedas berempah',
                price: 12,
              },
            ],
          },
        }
      ),
    },
    {
      action: ghost.tap(
        '[data-tour="step2-next"]',
        {
          title: "Menu locked in",
          body: "Now your contact details.",
          position: "top",
          duration: 1500,
        },
        { demoUpdate: {} }
      ),
      afterStep: 3,
    },
    {
      action: ghost.wait(700),
    },
    {
      action: ghost.type(
        '[data-tour="step3-name"]',
        'Ali bin Ahmad',
        {
          title: "Step 3 — Your name",
          body: "The person we should contact about this order.",
          position: "bottom",
          duration: 1800,
        },
        { demoUpdate: { name: 'Ali bin Ahmad' }, speed: 80 }
      ),
    },
    {
      action: ghost.type(
        '[data-tour="step3-contact"]',
        '0123456789',
        {
          title: "Phone number",
          body: "We'll call to confirm the details.",
          position: "bottom",
          duration: 1800,
        },
        { demoUpdate: { contact: '0123456789' }, speed: 60 }
      ),
    },
    {
      action: ghost.type(
        '[data-tour="step3-email"]',
        'ali@example.com',
        {
          title: "Email address",
          body: "Your invoice will be sent here.",
          position: "bottom",
          duration: 1800,
        },
        { demoUpdate: { email: 'ali@example.com' }, speed: 50 }
      ),
    },
    {
      action: ghost.type(
        '[data-tour="step3-confirm-email"]',
        'ali@example.com',
        {
          title: "Confirm email",
          body: "Same address as above.",
          position: "bottom",
          duration: 1600,
        },
        { demoUpdate: { confirmEmail: 'ali@example.com' }, speed: 50 }
      ),
    },
    {
      action: ghost.tap(
        '[data-tour="step3-location"]',
        {
          title: "Event location",
          body: "Where should we deliver?",
          position: "bottom",
          duration: 1800,
        },
        { demoUpdate: { location: 'Dewan Serbaguna' } }
      ),
    },
    {
      action: ghost.tap(
        '[data-tour="step3-next"]',
        {
          title: "Review your order",
          body: "One last check before we submit.",
          position: "top",
          duration: 1500,
        },
        { demoUpdate: {} }
      ),
      afterStep: 4,
    },
    {
      action: ghost.wait(700),
    },
    {
      action: ghost.scroll(
        '[data-tour="step4-review"]',
        {
          title: "Step 4 — Review",
          body: "Confirm everything looks right.",
          position: "bottom",
          duration: 2000,
        }
      ),
    },
    {
      action: ghost.scroll(
        '[data-tour="step4-submit"]',
        {
          title: "Ready to submit",
          body: "Check your event details and tap Submit when ready.",
          position: "top",
          duration: 2200,
        }
      ),
    },
    {
      action: ghost.glow(
        '[data-tour="step4-submit"]',
        {
          title: "You're all set 🎉",
          body: "This demo is finished. Tap Submit to place your real order.",
          position: "top",
          duration: 2600,
        },
        { glowDuration: 3200 }
      ),
    },
    {
      action: ghost.wait(800),
    },
  ];

  return steps.map(({ action, afterStep }) => {
    if (afterStep) {
      return {
        ...action,
        demoUpdate: {
          ...(action.demoUpdate || {}),
          __step: afterStep,
        },
      };
    }
    return action;
  });
}

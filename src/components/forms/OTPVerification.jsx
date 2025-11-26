import { useState, useRef, useEffect } from 'react';
import Button from '../ui/Button.jsx';
import Modal from '../ui/Modal.jsx';

function OTPVerification({ isOpen, onClose, onVerify, title = "Enter Verification Code" }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setOtp(['', '', '', '', '', '']);
      setError('');
      // Focus first input when modal opens
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only take the last digit
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    setError('');
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isValid = await onVerify(otpString);
      if (isValid) {
        onClose();
        setOtp(['', '', '', '', '', '']);
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center">
          <p className="text-slate-600 mb-6">
            We've sent a 6-digit verification code to your registered device. 
            Enter it below to continue.
          </p>
          
          <div className="flex justify-center space-x-3 mb-4">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-center text-xl font-semibold border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                maxLength={1}
              />
            ))}
          </div>
          
          {error && (
            <p className="text-red-600 text-sm mb-4">{error}</p>
          )}
          
          <div className="text-sm text-slate-500 mb-6">
            Didn't receive a code? 
            <button 
              type="button"
              className="text-blue-600 hover:text-blue-700 font-medium ml-1"
              onClick={() => {
                // Simulate resend
                setError('');
                alert('Verification code resent!');
              }}
            >
              Resend Code
            </button>
          </div>
        </div>

        <div className="flex space-x-4">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            loading={loading}
          >
            Verify Code
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default OTPVerification;
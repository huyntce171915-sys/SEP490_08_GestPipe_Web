
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Key, Lock, Loader2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import authService from '../services/authService';
import logo from '../assets/images/Logo.png';
import backgroundImage from '../assets/backgrounds/background.jpg';
import { useTheme } from '../utils/ThemeContext';

const ForgotPassword = () => {
  const { theme } = useTheme();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Step 1: Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    setEmailError('');

    // Client-side validation
    if (!email.trim()) {
      setEmailError('Email is required');
      setLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const res = await authService.sendForgotPasswordOTP(email);
      if (res.success) {
        setStep(2);
        setMessage('OTP has been sent to your email. Please check your inbox.');
      } else {
        const errorData = res;
        const errorType = errorData?.errorType;
        
        if (errorType === 'email_not_found') {
          setEmailError(errorData.message || 'Email not found in system');
        } else {
          setError(errorData.message || 'Failed to send OTP');
        }
      }
    } catch (err) {
      const errorData = err?.response?.data;
      const errorType = errorData?.errorType;
      
      if (errorType === 'email_not_found') {
        setEmailError(errorData.message || 'Email not found in system');
      } else {
        setError(errorData?.message || 'Failed to send OTP');
      }
    }
    setLoading(false);
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    setOtpError('');

    // Client-side validation
    if (!otp.trim()) {
      setOtpError('OTP is required');
      setLoading(false);
      return;
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      setOtpError('Please enter a valid 6-digit OTP');
      setLoading(false);
      return;
    }

    try {
      const res = await authService.verifyForgotPasswordOTP(email, otp);
      if (res.success) {
        setStep(3);
        setMessage('OTP is valid. You can set a new password.');
      } else {
        const errorData = res;
        const errorType = errorData?.errorType;
        
        if (errorType === 'otp_not_found' || errorType === 'invalid_otp' || errorType === 'otp_expired') {
          setOtpError(errorData.message || 'Invalid or expired OTP');
        } else {
          setError(errorData.message || 'Failed to verify OTP');
        }
      }
    } catch (err) {
      const errorData = err?.response?.data;
      const errorType = errorData?.errorType;
      
      if (errorType === 'otp_not_found' || errorType === 'invalid_otp' || errorType === 'otp_expired') {
        setOtpError(errorData.message || 'Invalid or expired OTP');
      } else {
        setError(errorData?.message || 'Failed to verify OTP');
      }
    }
    setLoading(false);
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    setPasswordError('');
    setConfirmPasswordError('');

    // Client-side validation
    let hasErrors = false;

    if (!newPassword.trim()) {
      setPasswordError('New password is required');
      hasErrors = true;
    } else if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      hasErrors = true;
    }

    if (!confirmPassword.trim()) {
      setConfirmPasswordError('Confirm password is required');
      hasErrors = true;
    } else if (newPassword.trim() && newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasErrors = true;
    }

    if (hasErrors) {
      setLoading(false);
      return;
    }

    try {
      const res = await authService.resetForgotPassword(email, newPassword);
      if (res.success) {
        setMessage('Password changed successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/');
        }, 1200);
      } else {
        setError(res.message || 'Failed to change password');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to change password');
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden font-montserrat pb-32"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-6 mx-auto"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={logo} alt="GestPipe Logo" className="mx-auto w-80 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
        </div>

        <div className="backdrop-blur-xl bg-black/40 rounded-3xl p-8 shadow-2xl border border-white/10 relative overflow-hidden">
          {/* Decorative gradient blob */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl"></div>

          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Forgot Password
            </h2>
            <p className="text-gray-400 text-center mb-6 text-sm">
              {step === 1 && "Enter your email to receive an OTP"}
              {step === 2 && "Enter the OTP sent to your email"}
              {step === 3 && "Create a new password"}
            </p>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-sm text-center"
              >
                {error}
              </motion.div>
            )}
            {message && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm text-center flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} /> {message}
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.form 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleSendOTP} 
                  noValidate 
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-400 transition-colors" size={20} />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={e => {
                          setEmail(e.target.value);
                          setEmailError('');
                        }}
                        className={`w-full pl-12 pr-5 py-3.5 bg-black/20 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all ${
                          emailError ? 'border-yellow-500/50 focus:border-yellow-500' : 'border-white/10 focus:border-cyan-500/50'
                        }`}
                      />
                    </div>
                    {emailError && (
                      <p className="text-yellow-400 text-xs ml-1">{emailError}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl 
                             hover:from-cyan-500 hover:to-blue-500 hover:shadow-lg hover:shadow-cyan-500/20 
                             active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed 
                             flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : 'Send OTP'}
                  </button>
                </motion.form>
              )}

              {step === 2 && (
                <motion.form 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleVerifyOTP} 
                  noValidate 
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <div className="relative group">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-400 transition-colors" size={20} />
                      <input
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={e => {
                          setOtp(e.target.value);
                          setOtpError('');
                        }}
                        className={`w-full pl-12 pr-5 py-3.5 bg-black/20 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all ${
                          otpError ? 'border-yellow-500/50 focus:border-yellow-500' : 'border-white/10 focus:border-cyan-500/50'
                        }`}
                        maxLength={6}
                      />
                    </div>
                    {otpError && (
                      <p className="text-yellow-400 text-xs ml-1">{otpError}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-green-600 to-cyan-600 text-white font-bold rounded-xl 
                             hover:from-green-500 hover:to-cyan-500 hover:shadow-lg hover:shadow-green-500/20 
                             active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed 
                             flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : 'Verify OTP'}
                  </button>
                </motion.form>
              )}

              {step === 3 && (
                <motion.form 
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleResetPassword} 
                  noValidate 
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-400 transition-colors" size={20} />
                      <input
                        type="password"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={e => {
                          setNewPassword(e.target.value);
                          setPasswordError('');
                        }}
                        className={`w-full pl-12 pr-5 py-3.5 bg-black/20 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all ${
                          passwordError ? 'border-yellow-500/50 focus:border-yellow-500' : 'border-white/10 focus:border-cyan-500/50'
                        }`}
                      />
                    </div>
                    {passwordError && (
                      <p className="text-yellow-400 text-xs ml-1">{passwordError}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-400 transition-colors" size={20} />
                      <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={e => {
                          setConfirmPassword(e.target.value);
                          setConfirmPasswordError('');
                        }}
                        className={`w-full pl-12 pr-5 py-3.5 bg-black/20 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all ${
                          confirmPasswordError ? 'border-yellow-500/50 focus:border-yellow-500' : 'border-white/10 focus:border-cyan-500/50'
                        }`}
                      />
                    </div>
                    {confirmPasswordError && (
                      <p className="text-yellow-400 text-xs ml-1">{confirmPasswordError}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold rounded-xl 
                             hover:from-purple-500 hover:to-cyan-500 hover:shadow-lg hover:shadow-purple-500/20 
                             active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed 
                             flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : 'Change Password'}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Back to Login Link */}
            <div className="mt-6 text-center border-t border-white/10 pt-4">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from './auth.queries';
import { Button, Input, useToast } from '@/components/ui';
import { AxiosError } from 'axios';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

function TeamOSLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white text-sm">
        T
      </div>
      <span className="text-xl font-semibold tracking-tight text-slate-100">TeamOS</span>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const register = useRegister();

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      await register.mutateAsync({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      toast('Account created! Welcome to TeamOS.', 'success');
      navigate('/workspaces');
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
      const msg =
        axiosErr.response?.data?.error?.message ?? 'Failed to create account. Try again.';
      toast(msg, 'error');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <TeamOSLogo />
          <p className="text-sm text-slate-400">Create your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl flex flex-col gap-4">
            <Input
              label="Full name"
              type="text"
              placeholder="Alex Johnson"
              autoComplete="name"
              error={errors.name?.message}
              {...formRegister('name')}
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              error={errors.email?.message}
              {...formRegister('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              hint="Minimum 8 characters"
              error={errors.password?.message}
              {...formRegister('password')}
            />
            <Input
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...formRegister('confirmPassword')}
            />

            <Button type="submit" isLoading={register.isPending} className="w-full mt-1">
              Create account
            </Button>
          </div>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

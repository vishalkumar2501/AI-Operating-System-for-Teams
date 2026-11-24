import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from './auth.queries';
import { Button, Input, useToast, Logo } from '@/components/ui';
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
      const msg = axiosErr.response?.data?.error?.message ?? 'Failed to create account. Try again.';
      toast(msg, 'error');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 text-text">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Logo variant="full" size="md" />
          <p className="text-sm text-text-2">Create your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-card flex flex-col gap-4">
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

        <p className="mt-5 text-center text-sm text-text-3">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
export default RegisterPage;
